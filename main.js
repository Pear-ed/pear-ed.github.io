// Lightbox Configuration
const lightboxConfig = {
    showCounter: false,
    captions: false,
    animationSpeed: 0,
    fadeSpeed: 0,
    animationSlide: false,
    spinner: true,
    preloading: true,
    enableKeyboard: true,
    scrollZoom: false,
    close: false,
    overlay: true,
    overlayOpacity: 0.8,
    disableScroll: false,
    closeOnOverlayClick: true,
    docClose: true,
    nav: true,
    swipeClose: true,
    doubleTapZoom: 2,
    widthRatio: 0.8,
    heightRatio: 0.8,
    touchNavigation: true,
    touchEvents: true,
    touchStart: true,
    touchEnd: true
};

function createCustomPanes() {
    // Create custom panes for each project, higher number = higher z-index
    for (let i = 1; i <= 20; i++) {
        map.createPane(`project${i}`);
        map.getPane(`project${i}`).style.zIndex = 400 + (21 - i); // Reverse the order so ID 1 has highest z-index
    }
}

const map = L.map("map", {
  center: window.innerWidth <= 768 ? [52.3388, 4.8725] : [52.3388, 4.8725],
  zoom: window.innerWidth <= 768 ? 9 : 10,
  maxZoom: 19,
  minZoom: 2,
  scrollWheelZoom: true,
  zoomControl: false
});

// Create panes immediately after map initialization
createCustomPanes();

L.control.zoom({
position: 'topright'
}).addTo(map);

// Mapbox layer
const mapLayer = L.tileLayer(
    "https://api.mapbox.com/styles/v1/hbmalanhbmalan/clzdyq5jt00d001qqaqyy80iw/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiaGJtYWxhbmhibWFsYW4iLCJhIjoiY2x6ZHNlZ3MzMG1reTJrczhxZTgyeWo0NSJ9.4QknS0vpgvqLHCRB5VOiTQ",
    {
      attribution:
            '&copy; <a href="https://osm.org/copyright">Mapbox</a> contributors'
    }
).addTo(map);


// Common polygon style function - now takes a color parameter and ID
function getPolygonStyle(color, projectId) {
    return {
        pane: `project${projectId}`,
        color: color,
        weight: 2,              
        fillColor: color,
        fillOpacity: 0.3
    };
}

// Marker style function
function getMarkerStyle(color, projectId) {
    return {
        pane: `project${projectId}`,
        radius: 8,
        fillColor: color,
        color: color,
        weight: 2,
        opacity: 1,
        fillOpacity: 1
    };
}

// Create a marker cluster group with custom options
var markers = L.markerClusterGroup({
    maxClusterRadius: 30,
    iconCreateFunction: function(cluster) {
        var childCount = cluster.getChildCount();
        return new L.DivIcon({
            html: '<div><span>' + childCount + '</span></div>',
            className: 'marker-cluster marker-cluster-small',
            iconSize: new L.Point(30, 30)
        });
    },
    disableClusteringAtZoom: 10,
    spiderfyOnMaxZoom: false,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true
});

// Replace the static mapFlyConfig with this function
function getMapFlyConfig(currentCenter, targetCenter, currentZoom = null, targetZoom = null) {
    // Calculate distance between points using the Haversine formula
    const R = 6371; // Earth's radius in kilometers
    const lat1 = currentCenter.lat * Math.PI / 180;
    const lat2 = targetCenter[0] * Math.PI / 180;
    const dLat = (targetCenter[0] - currentCenter.lat) * Math.PI / 180;
    const dLon = (targetCenter[1] - currentCenter.lng) * Math.PI / 180;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    // Calculate zoom difference if zoom levels are provided
    const zoomDiff = currentZoom && targetZoom ? Math.abs(targetZoom - currentZoom) : 0;
    
    // Adjust duration calculation for distance
    // Make it faster for close points (under 100km) but maintain smooth transitions for longer distances
    const distanceDuration = distance < 10 
        ? Math.max(0.4, distance / 200)  // Faster for close points
        : Math.min(3.5, Math.max(2, distance / 1000)); // Original calculation for distant points
    
    const zoomDuration = Math.min(2.5, Math.max(0.4, zoomDiff * 0.3)); // Slightly faster zoom
    
    // Use the longer of the two durations
    const duration = Math.max(distanceDuration, zoomDuration);
    
    return {
        duration: duration,
        easeLinearity: 0.25,
        animate: true,
        noMoveStart: true
    };
}

// Add this near mapFlyConfig
const navFlyConfig = {
    duration: 3,        // Faster duration for nav buttons
    easeLinearity: 0.5,   // More linear movement
    animate: true,
    noMoveStart: true
};

// Define this at the top level with other constants
const SIDEBAR_POSITIONS = {
    'sidebar-exhibition': '77vh',
    'sidebar-map': '84vh',
    'sidebar-about': '91vh'
};

// Helper function to set sidebar position
function setSidebarPosition(sidebar, position) {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        sidebar.style.top = typeof position === 'number' ? `${position}px` : position;
    }
}

// Helper function to close all sidebars
function closeAllSidebars() {
    const isMobile = window.innerWidth <= 768;
    document.querySelectorAll('.sidebar').forEach(sb => {
        sb.classList.remove('open');
        if (isMobile) {
            setSidebarPosition(sb, SIDEBAR_POSITIONS[sb.id]);
        }
    });
}

// Update click/touch handlers to be more specific
function isMainContentClick(e) {
    const target = e.target;
    // Check if the click is not inside any sidebar or toggle button
    return !target.closest('.sidebar') && 
           !target.closest('.sidebar-toggle') &&
           !target.closest('.sidebar-content');
}

// Initialize click handlers
function initializeClickHandlers() {
    const isMobile = window.innerWidth <= 768;

    // Add click handler to document body to catch clicks outside sidebars
    document.body.addEventListener('click', function(e) {
        if (isMainContentClick(e)) {
            closeAllSidebars();
        }
    });

    if (isMobile) {
        document.body.addEventListener('touchend', function(e) {
            // Only handle touchend if it's not part of a drag
            const sidebar = e.target.closest('.sidebar');
            if (sidebar && !sidebar.classList.contains('dragging')) {
                if (isMainContentClick(e)) {
                    closeAllSidebars();
                }
            }
        }, { passive: true });
    }
}

function initializeMobileDrag() {
    const sidebars = document.querySelectorAll('.sidebar');
    const isMobile = window.innerWidth <= 768;

    sidebars.forEach(sidebar => {
        const toggle = sidebar.querySelector('.sidebar-toggle');
        let startY = 0;
        let currentY = 0;
        let isDragging = false;
        let touchStartTime = 0;
        let initialSidebarTop = 0;

        // Add click handler for the toggle
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const category = sidebar.id.replace('sidebar-', '');
            
            // Close exhibition sidebar when opening map or about
            if (category === 'map' || category === 'about') {
                const exhibitionSidebar = document.getElementById('sidebar-exhibition');
                if (exhibitionSidebar) {
                    exhibitionSidebar.classList.remove('open');
                    if (isMobile) {
                        setSidebarPosition(exhibitionSidebar, SIDEBAR_POSITIONS['sidebar-exhibition']);
                    }
                }
            }
            
            const isOpen = sidebar.classList.toggle('open');
            if (isMobile) {
                setSidebarPosition(sidebar, isOpen ? '20vh' : SIDEBAR_POSITIONS[sidebar.id]);
            }
        });

        if (isMobile) {
            toggle.addEventListener('touchstart', function(e) {
                startY = e.touches[0].clientY;
                touchStartTime = Date.now();
                isDragging = false;
                initialSidebarTop = sidebar.getBoundingClientRect().top;
                sidebar.classList.add('dragging');
                e.preventDefault();
            });

            toggle.addEventListener('touchmove', function(e) {
                currentY = e.touches[0].clientY;
                const deltaY = currentY - startY;

                if (Math.abs(deltaY) > 2) {
                    isDragging = true;
                }

                if (isDragging) {
                    let newTop = initialSidebarTop + deltaY;
                    const maxTop = window.innerHeight - 100;
                    const minTop = 100;
                    
                    if (newTop < minTop) {
                        newTop = minTop + (newTop - minTop) * 0.2;
                    } else if (newTop > maxTop) {
                        newTop = maxTop + (newTop - maxTop) * 0.2;
                    }
                    
                    sidebar.style.transition = 'none';
                    setSidebarPosition(sidebar, newTop);
                }
                e.preventDefault();
            });

            toggle.addEventListener('touchend', function(e) {
                sidebar.classList.remove('dragging');
                const touchDuration = Date.now() - touchStartTime;
                const deltaY = startY - currentY;
                const velocity = Math.abs(deltaY) / touchDuration;
                
                sidebar.style.transition = 'top 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
                
                if (touchDuration < 150 && !isDragging) {
                    // Handle as a click - toggle sidebar
                    const category = sidebar.id.replace('sidebar-', '');
                    
                    // Close exhibition sidebar when opening map or about
                    if (category === 'map' || category === 'about') {
                        const exhibitionSidebar = document.getElementById('sidebar-exhibition');
                        if (exhibitionSidebar) {
                            exhibitionSidebar.classList.remove('open');
                            setSidebarPosition(exhibitionSidebar, SIDEBAR_POSITIONS['sidebar-exhibition']);
                        }
                    }
                    
                    const isOpen = sidebar.classList.toggle('open');
                    setSidebarPosition(sidebar, isOpen ? '20vh' : SIDEBAR_POSITIONS[sidebar.id]);
                } else if (isDragging) {
                    const currentTop = sidebar.getBoundingClientRect().top;
                    const maxAllowedTop = parseFloat(SIDEBAR_POSITIONS[sidebar.id]) * window.innerHeight / 100;
                    
                    if (currentTop < window.innerHeight * 0.4 || deltaY > 30) {
                        sidebar.classList.add('open');
                        setSidebarPosition(sidebar, '20vh');
                    } else {
                        // If dragged down past threshold or original position, snap to closed
                        sidebar.classList.remove('open');
                        setSidebarPosition(sidebar, SIDEBAR_POSITIONS[sidebar.id]);
                    }
                }
            });
        }
    });
}

// Call initializeClickHandlers and initializeMobileDrag when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeClickHandlers();
    initializeMobileDrag();
    const aboutToggle = document.querySelector('.about-toggle');
    const aboutContainer = document.querySelector('.about-container');
    const contactToggle = document.querySelector('.contact-toggle');
    const contactContainer = document.querySelector('.contact-container');
    
    if (aboutToggle && aboutContainer) {
        aboutToggle.addEventListener('click', function() {
            aboutContainer.classList.toggle('expanded');
        });
    }

    if (contactToggle && contactContainer) {
        contactToggle.addEventListener('click', function() {
            contactContainer.classList.toggle('expanded');
        });
    }

    // Initialize navigation buttons
    const amsterdamButton = createNavButton('amsterdam-button', 'go to the Netherlands ↑', {
        coords: netherlandsBounds.getCenter(),
        zoom: map.getBoundsZoom(netherlandsBounds),
        options: navFlyConfig
    });

    const capetownButton = createNavButton('capetown-button', 'go to South Africa ↓', {
        coords: capetownBounds.getCenter(),
        zoom: map.getBoundsZoom(capetownBounds),
        options: navFlyConfig
    });

    // Set initial button visibility
    const currentBounds = map.getBounds();
    amsterdamButton.style.display = currentBounds.intersects(netherlandsBounds) ? 'none' : 'block';
    capetownButton.style.display = currentBounds.intersects(capetownBounds) ? 'none' : 'block';
});

// Function to load and display prints
function loadPrints() {
    console.log('Starting loadPrints function');
    
    const printsGallery = document.querySelector('.prints-gallery');
    console.log('Prints gallery element:', printsGallery);
    
    if (!printsGallery) {
        console.error('Could not find .prints-gallery element');
        return;
    }

    // Fetch prints data from JSON file
    fetch('data/prints.json')
        .then(response => {
            console.log('Fetch response:', response);
            return response.json();
        })
        .then(data => {
            if (!data || !data.prints) {
                console.error('No prints found in data');
                return;
            }

            console.log('Loaded prints data:', data.prints);

            // Clear any existing content
            printsGallery.innerHTML = '';

            // Add each print to the gallery
            data.prints.forEach(print => {
                const printCard = document.createElement('div');
                printCard.className = 'print-card';
                printCard.innerHTML = `
                    <div class="print-item">
                        <a href="${print.image}" data-lightbox="prints">
                            <img src="${print.image}" alt="${print.title}">
                        </a>
                        <div class="print-info">
                            <h3>${print.title}</h3>
                            <p>${print.edition}</p>
                        </div>
                    </div>
                `;
                printsGallery.appendChild(printCard);
            });

            console.log('Added prints to gallery');
            console.log('Prints gallery HTML:', printsGallery.innerHTML);

            // Add a small delay before initializing lightbox
            setTimeout(() => {
                const lightbox = new SimpleLightbox('.prints-gallery a', lightboxConfig);
                console.log('Initialized lightbox');
            }, 100);
        })
        .catch(error => {
            console.error('Error loading prints data:', error);
        });
}

// Call loadPrints when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, calling loadPrints');
    loadPrints();
});

// Function to load and display exhibition images
function loadExhibitionImages() {
    const exhibitionList = document.querySelector('.exhibition-list');
    if (!exhibitionList) {
        console.error('Could not find .exhibition-list element');
        return;
    }

    // Create containers for each hypothesis
    const hypothesis1Container = document.createElement('div');
    hypothesis1Container.className = 'hypothesis-container';
    hypothesis1Container.innerHTML = `<h2>Hypothesis 1</h2><p class="hypothesis-text">Hypothesis 1 is the debut collaborative project from Cynthia Fan and Hayden Malan. Their shared enquiry into botany, biology and art centres on the guiding question: "What do plants really want?" At once resisting and quoting traditions of flower arranging, the pair's botanical compositions become a medium for spending (more) time with organic matter and listening to the non-human sentient. The plants, shifting and changing over the course of the project, insist their autonomy – some wilt, others send out aerial roots, growth and decay persist.Cynthia Fan is a florist and PhD candidate at The University of Edinburgh's Institute of Molecular Plant Sciences. Hayden Malan is a landscape architect and artist. Together, they share a preoccupation with the sculptural potential of plants as both natural organisms and modular structures.</p><div class="exhibition-gallery"></div>`;

    const hypothesis2Container = document.createElement('div');
    hypothesis2Container.className = 'hypothesis-container';
    hypothesis2Container.innerHTML = `<h2>Hypothesis 2</h2><p class="hypothesis-text">We continue where we left off with Hypothesis 2, a collaboration with our talented and insightful friend, Mishaq Diesel, in the @a4artsfoundation@proto.a4 Goods area. Happening tomorrow (24/02/2023), the conversation will focus on the Firewheel tree (Stenocarpus sinuatus), because when that tree fell in that archetypal forest Mishaq recorded its dying wish. The Firewheel tree's flowers will be collected from a tree 68 metres from Hayden's apartment in Green Point, Cape Town. Mishaq Diesel is a South African composer and experimental musician. Influenced sonically by the likes of Harold Budd and Mokichi Kawaguchi, his work reflects nature's ever-changing tendencies. 'Missim' is his forthcoming multidisciplinary instrumentalist project exploring musical tone as a therapeutic practice.</p><div class="exhibition-gallery"></div>`;

    // Get all h1 images
    const h1Images = Array.from({length: 11}, (_, i) => `img/exhibition/h1_${i + 1}.jpg`);
    // Get all h2 images
    const h2Images = Array.from({length: 4}, (_, i) => `img/exhibition/h2_${i + 1}.jpg`);

    // Add h1 images to hypothesis 1 container
    h1Images.forEach(img => {
        const imgContainer = document.createElement('div');
        imgContainer.className = 'exhibition-item';
        imgContainer.innerHTML = `
            <a href="${img}" data-lightbox="exhibition">
                <img src="${img}" alt="Hypothesis 1 image">
            </a>
        `;
        hypothesis1Container.querySelector('.exhibition-gallery').appendChild(imgContainer);
    });

    // Add h2 images to hypothesis 2 container
    h2Images.forEach(img => {
        const imgContainer = document.createElement('div');
        imgContainer.className = 'exhibition-item';
        imgContainer.innerHTML = `
            <a href="${img}" data-lightbox="exhibition">
                <img src="${img}" alt="Hypothesis 2 image">
            </a>
        `;
        hypothesis2Container.querySelector('.exhibition-gallery').appendChild(imgContainer);
    });

    // Add containers to the exhibition list
    exhibitionList.appendChild(hypothesis1Container);
    exhibitionList.appendChild(hypothesis2Container);

    // Initialize SimpleLightbox for the exhibition galleries
    setTimeout(() => {
        const lightbox = new SimpleLightbox('.exhibition-gallery a', lightboxConfig);
        console.log('Initialized exhibition lightbox');
    }, 100);
}

// Call loadExhibitionImages when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    loadExhibitionImages();
});

// Define shared icon configuration
const sharedIconConfig = {
    iconSize: [38, 38],
    iconAnchor: [0, 0],
    popupAnchor: [19, 0]
};

// Load and initialize conversations from JSON
fetch('data/conversations.json')
    .then(response => response.json())
    .then(data => {
        if (!data || !data.conversations) {
            console.error('No conversations found in data');
            return;
        }

        console.log('Loading conversations:', data.conversations.length);
        
        data.conversations.forEach(conversation => {
            console.log('Processing conversation:', conversation.id, conversation.title);
            
            // Create custom icon using shared configuration
            const customIcon = L.icon({
                ...sharedIconConfig,
                iconUrl: `img/marker/${conversation.id}_1.png`
            });

            // Create popup content
            const popupContent = `
                <div class='popup-content'>
                    <div class="popup-id">${conversation.id}</div>
                    <h3><i>${conversation.title}</i></h3>
                    <div class="popup-image-container">
                        <img src="img/marker/${conversation.id}_2.png" alt="${conversation.title}">
                    </div>
                </div>
            `;

            // Create marker with custom icon
            const marker = L.marker(
                conversation.geometry.coordinates,
                { icon: customIcon }
            ).bindPopup(popupContent);

            // Add marker to cluster group
            markers.addLayer(marker);
        });

        console.log('Adding markers layer to map');
        map.addLayer(markers);
        console.log('Markers added to map');
    })
    .catch(error => {
        console.error('Error loading conversation data:', error);
    });

// Update the createNavButton function
function createNavButton(id, text, viewConfig) {
    const button = document.createElement('button');
    button.id = id;
    button.className = 'nav-button';
    button.textContent = text;
    button.style.display = 'none';
    
    button.addEventListener('click', () => {
        map.flyTo(viewConfig.coords, viewConfig.zoom, viewConfig.options);  // Use the options here
    });
    
    document.querySelector('#sidebar-map .sidebar-content').appendChild(button);
    return button;
}

// Define bounding boxes for both areas
const netherlandsBounds = L.latLngBounds(
    [50.75, 3.2],   // Southwest corner
    [53.7, 7.22]    // Northeast corner
);

const capetownBounds = L.latLngBounds(
    [-34.5, 18.2],  // Southwest corner
    [-33.5, 18.9]   // Northeast corner
);

// Update the moveend event handler to use bounds instead of distance
map.on('moveend', () => {
    const currentBounds = map.getBounds();
    
    // Show Amsterdam button if current view doesn't intersect with Netherlands bounds
    amsterdamButton.style.display = currentBounds.intersects(netherlandsBounds) 
        ? 'none' 
        : 'block';
    
    // Show Cape Town button if current view doesn't intersect with Cape Town bounds
    capetownButton.style.display = currentBounds.intersects(capetownBounds) 
        ? 'none' 
        : 'block';
});

// Update the button click handlers to fit the bounds instead of specific coordinates
const amsterdamButton = createNavButton('amsterdam-button', 'go to the Netherlands ↑', {
    coords: netherlandsBounds.getCenter(),
    zoom: map.getBoundsZoom(netherlandsBounds),
    options: navFlyConfig
});

const capetownButton = createNavButton('capetown-button', 'go to South Africa ↓', {
    coords: capetownBounds.getCenter(),
    zoom: map.getBoundsZoom(capetownBounds),
    options: navFlyConfig
});


