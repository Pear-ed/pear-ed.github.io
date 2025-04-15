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

// Color definitions for categories
const categoryColors = {
    'exhibition': '#795C5F',    // Base color
    'print': '#52414C',    // Slightly lighter shade
    'conversation': '#ED455C'       // Another lighter shade
};

// Update CSS variables
document.documentElement.style.setProperty('--art-color', categoryColors.exhibition);
document.documentElement.style.setProperty('--water-color', categoryColors.print);
document.documentElement.style.setProperty('--conversation-color', categoryColors.conversation);


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
    maxClusterRadius: 40,
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

// Update the lightbox configuration
const lightboxConfig = {
    showCounter: false,
    captions: false,
    animationSpeed: 0,
    fadeSpeed: 0,
    animationSlide: false,
    spinner: true,
    preloading: true,
    enableKeyboard: true,
    scrollZoom: true,
    close: false,
    overlay: true,
    overlayOpacity: 0.8,
    disableScroll: false,
    closeOnOverlayClick: true,
};

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
    'sidebar-art': '82vh',
    'sidebar-water': '75vh',
    'sidebar-conversation': '68vh'
};

// Helper function to set sidebar position
function setSidebarPosition(sidebar, position) {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        sidebar.style.top = typeof position === 'number' ? `${position}px` : position;
    }
}

// Consolidated closeAllSidebars function
function closeAllSidebars() {
    const isMobile = window.innerWidth <= 768;
    document.querySelectorAll('.sidebar').forEach(sb => {
        sb.classList.remove('open');
        if (isMobile) {
            setSidebarPosition(sb, SIDEBAR_POSITIONS[sb.id]);
        }
    });
}

// Update handleSidebarOpen to use the consolidated functions
function handleSidebarOpen(category) {
    const isMobile = window.innerWidth <= 768;
    const sidebar = document.getElementById(`sidebar-${category}`);
    
    closeAllSidebars();
    
    if (sidebar) {
        sidebar.classList.add('open');
        if (isMobile) {
            setSidebarPosition(sidebar, '20vh');
        }
    }
}

// Function to handle popup visibility based on zoom and device
const handlePopupVisibility = function(element) {
    const isMobile = window.innerWidth <= 768;
    const currentZoom = map.getZoom();
    
    if (isMobile && currentZoom > 9) {
        element.openPopup();
    } else {
        element.closePopup();
    }
};

// Update the function that creates markers and polygons
function addPolygonAndMarker(coords, popupContent, projectid, category) {
    console.log('Adding marker for project:', projectid, 'at coords:', coords);
    const categoryColor = categoryColors[category];
    const projectId = parseInt(projectid);
    
    // For point markers, coords is already [lat, lng]
    const [lat, lng] = coords;
    
    // Common click handler function for markers
    const handleElementClick = function(e) {
        if (e.originalEvent) e.originalEvent.stopPropagation();
        
        handleSidebarOpen(category);
        
        const projectCard = document.getElementById(`project-${projectId}`).closest('.project-card');
        if (projectCard) {
            const sidebarContent = document.querySelector(`#sidebar-${category} .sidebar-content`);
            if (sidebarContent) {
                setTimeout(() => {
                    projectCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 300);
            }
        }
        
        const currentZoom = map.getZoom();
        if (currentZoom < 15) {
            const currentCenter = map.getCenter();
            const flyConfig = getMapFlyConfig(currentCenter, [lat, lng], currentZoom, 15);
            map.flyTo([lat, lng], 15, flyConfig);
        }
    };
    
    // Create visible marker
    let visibleMarker = L.circleMarker([lat, lng], getMarkerStyle(categoryColor, projectId))
        .on('click', handleElementClick)
        .bindPopup(popupContent, {
            autoPan: false,
            closeButton: false
        });
    
    console.log('Created visible marker:', visibleMarker);
    visibleMarker.addTo(map);
    
    // Create cluster marker
    let clusterMarker = L.circleMarker([lat, lng], getMarkerStyle(categoryColor, projectId))
        .on('click', handleElementClick)
        .bindPopup(popupContent, {
            autoPan: false,
            closeButton: false
        });
    
    console.log('Created cluster marker:', clusterMarker);
    markers.addLayer(clusterMarker);

    // Function to check and update popup visibility
    const checkPopupVisibility = () => {
        const isMobile = window.innerWidth <= 768;
        const currentZoom = map.getZoom();
        
        if (isMobile) {
            // Only control popup visibility by zoom on mobile
            if (currentZoom > 9) {
                if (map.hasLayer(visibleMarker)) visibleMarker.openPopup();
            } else {
                if (map.hasLayer(visibleMarker)) visibleMarker.closePopup();
            }
        }
    };

    // Add mouseover/mouseout for desktop without zoom restrictions
    if (window.innerWidth > 768) {
        // For visible marker
        visibleMarker.on('mouseover', function() { this.openPopup(); })
                    .on('mouseout', function() { this.closePopup(); });
        
        // For cluster marker (when visible at lower zoom levels)
        clusterMarker.on('mouseover', function() { this.openPopup(); })
                    .on('mouseout', function() { this.closePopup(); });
    }

    // Update the zoomend handler to not affect popup behavior on desktop
    map.on('zoomend', function() {
        const currentZoom = map.getZoom();
        const isMobile = window.innerWidth <= 768;
        
        // Layer visibility logic
        if (currentZoom <= 10) {
            if (map.hasLayer(visibleMarker)) map.removeLayer(visibleMarker);
        } else {
            if (!map.hasLayer(visibleMarker)) visibleMarker.addTo(map);
        }
        
        // Only control popup visibility on mobile
        if (isMobile) {
            checkPopupVisibility();
        }
    });
}

// Function to create popup content
function createPopupContent(project) {
    return `
        <div class='popup-content' data-category='${project.category}'>
            <h3 class='project-list-title'>${project.title}</h3>
            <p class='project-duration'>${project.duration}</p>
        </div>
    `;
}

// Function to create project card (update the existing function)
function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';
    
    const categoryColor = categoryColors[project.category];
    
    // Create a unique gallery class for this project
    const galleryClass = `gallery-${project.id}`;
    
    card.innerHTML = `
        <div id="project-${project.id}" class="project-details">
            <h2 style="--project-color: ${categoryColor}">${project.title}</h2>
            <h3>${project.city} · ${project.duration} · ${project.status}</h3>
            <h3>Company: ${project.company}</h3>
            ${project.role ? `<h3>Role: ${project.role}</h3>` : ''}
            <p>${project.description}</p>
            <div class="gallery ${galleryClass}">
                ${project.images.map((img, i) => `
                    <a href="${img}" class="gallery-item">
                        <img src="${img}" alt="${project.title} ${i + 1}">
                    </a>
                `).join('')}
            </div>
            <a href="${project.instagram}" target="_blank" class="instagram-link">More about this project</a>
        </div>
    `;

    // Add click handler to the card
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.gallery') && !e.target.closest('.instagram-link')) {
            const coords = project.geometry.coordinates;
            const centerLat = coords.reduce((sum, point) => sum + point[0], 0) / coords.length;
            const centerLng = coords.reduce((sum, point) => sum + point[1], 0) / coords.length;
            const currentCenter = map.getCenter();
            const currentZoom = map.getZoom();
            const flyConfig = getMapFlyConfig(currentCenter, [centerLat, centerLng], currentZoom, 15);
            map.flyTo([centerLat, centerLng], 15, flyConfig);

            // Update scroll behavior for mobile
            if (window.innerWidth <= 768) {
                const projectCard = document.getElementById(`project-${project.id}`);
                if (projectCard) {
                    setTimeout(() => {
                        projectCard.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center' // Change to center
                        });
                    }, 300);
                }
            }
        }
    });

    return card;
}

// Define shared icon configuration
const sharedIconConfig = {
    iconSize: [38, 38],
    iconAnchor: [0, 0],
    popupAnchor: [19, 0]
};

// Function to create conversation card
function createConversationCard(conversation) {
    const card = document.createElement('div');
    card.className = 'project-card';
    
    const categoryColor = categoryColors.conversation;
    
    card.innerHTML = `
        <div id="conversation-${conversation.id}" class="project-details">
            <div class="conversation-id">${conversation.id}</div>
            <h2 style="--project-color: ${categoryColor}"><i>${conversation.title}</i></h2>
            <p>${conversation.description}</p>
        </div>
    `;

    // Add click handler to the card
    card.addEventListener('click', (e) => {
        const coords = conversation.geometry.coordinates;
        const currentCenter = map.getCenter();
        const currentZoom = map.getZoom();
        const flyConfig = getMapFlyConfig(currentCenter, coords, currentZoom, 15);
        map.flyTo(coords, 15, flyConfig);

        // Update scroll behavior for mobile
        if (window.innerWidth <= 768) {
            const conversationCard = document.getElementById(`conversation-${conversation.id}`);
            if (conversationCard) {
                setTimeout(() => {
                    conversationCard.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center'
                    });
                }, 300);
            }
        }
    });

    return card;
}

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

            // Create and add conversation card
            const projectList = document.querySelector('.conversation-list');
            if (projectList) {
                const card = createConversationCard(conversation);
                projectList.appendChild(card);
            }
        });

        console.log('Adding markers layer to map');
        map.addLayer(markers);
        console.log('Markers added to map');
    })
    .catch(error => {
        console.error('Error loading conversation data:', error);
    });

// Reset positions when switching to desktop
function resetSidebarPositions() {
    if (window.innerWidth > 768) {
        document.querySelectorAll('.sidebar').forEach(sidebar => {
            sidebar.style.top = ''; // Remove the top property entirely
        });
    }
}

// Add resize event listener with debouncing
let resizeTimeout;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resetSidebarPositions, 250);
});

// Call it when the DOM is loaded
document.addEventListener('DOMContentLoaded', resetSidebarPositions);

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
    
    document.querySelector('.container').appendChild(button);
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

// Replace the existing welcome overlay creation with this function
function createWelcomeOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'welcome-overlay';
    
    const text = document.createElement('div');
    text.className = 'welcome-text';
    text.textContent = 'Click, zoom, move, please!';
    
    overlay.appendChild(text);
    document.body.appendChild(overlay);
    
    overlay.addEventListener('click', function() {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 500);
    });
}

// Call it when the DOM is loaded
document.addEventListener('DOMContentLoaded', createWelcomeOverlay);


function initializeMobileDrag() {
    const sidebars = document.querySelectorAll('.sidebar');
    const mapContainer = document.getElementById('map');
    const isMobile = window.innerWidth <= 768;

    // Helper function to close all sidebars
    function closeAllSidebars() {
        document.querySelectorAll('.sidebar').forEach(sb => {
            sb.classList.remove('open');
            if (isMobile) {
                sb.style.top = SIDEBAR_POSITIONS[sb.id];
            }
        });
    }

    // Update map click/touch handlers to be more specific
    function isMapBackgroundClick(e) {
        const target = e.target;
        return (target.classList.contains('leaflet-tile') || 
                target.classList.contains('leaflet-container')) && 
               !target.closest('.leaflet-marker-pane') && 
               !target.closest('.leaflet-overlay-pane') &&
               !target.closest('.leaflet-popup-pane') &&
               !target.closest('.sidebar');
    }

    // Update click/touch handlers to use consolidated closeAllSidebars
    if (!isMobile) {
        mapContainer.addEventListener('click', function(e) {
            if (isMapBackgroundClick(e)) {
                closeAllSidebars();
            }
        });
    }

    if (isMobile) {
        mapContainer.addEventListener('touchend', function(e) {
            if (isMapBackgroundClick(e)) {
                closeAllSidebars();
            }
        }, { passive: true });

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
                
                sidebars.forEach(sb => {
                    if (sb !== sidebar) {
                        sb.classList.remove('open');
                        setSidebarPosition(sb, SIDEBAR_POSITIONS[sb.id]);
                    }
                });
                
                const isOpen = sidebar.classList.toggle('open');
                setSidebarPosition(sidebar, isOpen ? '20vh' : SIDEBAR_POSITIONS[sb.id]);
            });

            toggle.addEventListener('touchstart', function(e) {
                startY = e.touches[0].clientY;
                touchStartTime = Date.now();
                isDragging = false;
                initialSidebarTop = sidebar.getBoundingClientRect().top;
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
                const touchDuration = Date.now() - touchStartTime;
                const deltaY = startY - currentY;
                const velocity = Math.abs(deltaY) / touchDuration;
                
                sidebar.style.transition = 'top 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
                
                if (touchDuration < 150 && !isDragging) {
                    // Handle as a click - toggle sidebar
                    sidebars.forEach(sb => {
                        if (sb !== sidebar) {
                            sb.classList.remove('open');
                            setSidebarPosition(sb, SIDEBAR_POSITIONS[sb.id]);
                        }
                    });
                    
                    const isOpen = sidebar.classList.toggle('open');
                    setSidebarPosition(sidebar, isOpen ? '20vh' : SIDEBAR_POSITIONS[sb.id]);
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
        });
    }

    // Update desktop click handlers to use consolidated pattern
    if (!isMobile) {
        document.querySelectorAll('.sidebar-toggle').forEach(toggle => {
            toggle.addEventListener('click', function(e) {
                const sidebar = this.parentElement;
                
                document.querySelectorAll('.sidebar').forEach(sb => {
                    if (sb !== sidebar) {
                        sb.classList.remove('open');
                    }
                });
                
                sidebar.classList.toggle('open');
            });
        });
    }
}

// Initialize drag functionality when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeMobileDrag);

// Add this to your JavaScript section
document.addEventListener('DOMContentLoaded', function() {
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
})

// Function to load and display prints
function loadPrints() {
    console.log('Starting loadPrints function');
    
    const printList = document.querySelector('.print-list');
    console.log('Print list element:', printList);
    
    if (!printList) {
        console.error('Could not find .print-list element');
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

            // Create a container for the prints
            const printsContainer = document.createElement('div');
            printsContainer.className = 'prints-gallery';
            console.log('Created prints container');

            // Add each print to the gallery
            data.prints.forEach(print => {
                const printCard = document.createElement('div');
                printCard.className = 'print-card';
                printCard.innerHTML = `
                    <div class="print-item">
                        <img src="${print.image}" alt="${print.title}">
                        <div class="print-info">
                            <h3>${print.title}</h3>
                            <p>${print.edition}</p>
                        </div>
                    </div>
                `;
                printsContainer.appendChild(printCard);
            });

            console.log('Added prints to container');
            console.log('Prints container HTML:', printsContainer.innerHTML);

            // Add the prints container to the sidebar
            printList.appendChild(printsContainer);
            console.log('Added prints container to sidebar');
            console.log('Print list HTML after adding container:', printList.innerHTML);

            // Initialize SimpleLightbox for the prints gallery
            new SimpleLightbox({
                elements: '.prints-gallery .print-item',
                ...lightboxConfig
            });
            console.log('Initialized lightbox');
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
    const artList = document.querySelector('.art-list');
    if (!artList) {
        console.error('Could not find .art-list element');
        return;
    }

    // Create containers for each hypothesis
    const hypothesis1Container = document.createElement('div');
    hypothesis1Container.className = 'hypothesis-container';
    hypothesis1Container.innerHTML = '<h2>Hypothesis 1</h2><div class="exhibition-gallery"></div>';

    const hypothesis2Container = document.createElement('div');
    hypothesis2Container.className = 'hypothesis-container';
    hypothesis2Container.innerHTML = '<h2>Hypothesis 2</h2><div class="exhibition-gallery"></div>';

    // Get all h1 images
    const h1Images = Array.from({length: 11}, (_, i) => `img/exhibition/h1_${i + 1}.jpg`);
    // Get all h2 images
    const h2Images = Array.from({length: 4}, (_, i) => `img/exhibition/h2_${i + 1}.jpg`);

    // Add h1 images to hypothesis 1 container
    h1Images.forEach(img => {
        const imgContainer = document.createElement('div');
        imgContainer.className = 'exhibition-item';
        imgContainer.innerHTML = `
            <a href="${img}" class="gallery-item">
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
            <a href="${img}" class="gallery-item">
                <img src="${img}" alt="Hypothesis 2 image">
            </a>
        `;
        hypothesis2Container.querySelector('.exhibition-gallery').appendChild(imgContainer);
    });

    // Add containers to the art list
    artList.appendChild(hypothesis1Container);
    artList.appendChild(hypothesis2Container);

    // Initialize SimpleLightbox for the exhibition galleries
    new SimpleLightbox({
        elements: '.exhibition-gallery .gallery-item',
        ...lightboxConfig
    });
}

// Call loadExhibitionImages when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    loadExhibitionImages();
});


