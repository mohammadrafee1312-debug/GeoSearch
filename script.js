
// =============================================
// GEOSEARCH - MAIN JAVASCRIPT
// UPDATED DASHBOARD VERSION
// =============================================


// =============================================
// 1. MAIN MAP
// =============================================

const geoMap = L.map("map", {
    keyboard: true,
    dragging: true,
    scrollWheelZoom: true,
    doubleClickZoom: true,
    touchZoom: true,
    boxZoom: true,
    zoomControl: true
}).setView([13.0827, 80.2707], 12);


// =============================================
// 2. DASHBOARD MAP
// =============================================

const dashboardMap = L.map("dashboardMap", {
    keyboard: true,
    dragging: true,
    scrollWheelZoom: true,
    touchZoom: true,
    zoomControl: true
}).setView([13.0827, 80.2707], 11);


// Shared OpenStreetMap tile URL

const TILE_URL =
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

const TILE_OPTIONS = {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
};


// Add tiles to main map

L.tileLayer(TILE_URL, TILE_OPTIONS).addTo(geoMap);


// Add tiles to dashboard map

L.tileLayer(TILE_URL, TILE_OPTIONS).addTo(dashboardMap);


// Dashboard operation layers

const dashboardOperationLayers =
    L.layerGroup().addTo(dashboardMap);


// =============================================
// 3. HTML ELEMENTS
// =============================================


// LOCATION SEARCH

const searchInput =
    document.getElementById("searchInput");

const searchButton =
    document.getElementById("searchButton");

const searchMessage =
    document.getElementById("searchMessage");


// LOCATION INFORMATION

const placeName =
    document.getElementById("placeName");

const placeAddress =
    document.getElementById("placeAddress");

const latitudeDisplay =
    document.getElementById("latitude");

const longitudeDisplay =
    document.getElementById("longitude");

const zoomLevelDisplay =
    document.getElementById("zoomLevel");


// SEARCH AREA CONTROLS

const selectAreaButton =
    document.getElementById("selectAreaButton");

const areaMessage =
    document.getElementById("areaMessage");

const generateGridButton =
    document.getElementById("generateGridButton");


// SECTOR DETAILS PANEL

const sectorDetailsPanel =
    document.getElementById("sectorDetailsPanel");

const selectedSectorTitle =
    document.getElementById("selectedSectorTitle");

const closeSectorPanel =
    document.getElementById("closeSectorPanel");

const sectorStatusSelect =
    document.getElementById("sectorStatusSelect");

const sectorTeamSelect =
    document.getElementById("sectorTeamSelect");

const sectorPanelMessage =
    document.getElementById("sectorPanelMessage");


// DASHBOARD FILTERS

const departmentFilter =
    document.getElementById("departmentFilter");

const operationStatusFilter =
    document.getElementById("operationStatusFilter");


// DASHBOARD MESSAGE

const dashboardMapMessage =
    document.getElementById("dashboardMessage");


// DASHBOARD STATISTICS

const activeOperationsDisplay =
    document.getElementById("activeOperationsCount");

const totalGridsDisplay =
    document.getElementById("totalGridsCount");

const completedSectorsDisplay =
    document.getElementById("completedSectorsCount");

const followUpDisplay =
    document.getElementById("followUpCount");


// =============================================
// 4. SEARCH AREA VARIABLES
// =============================================

let isSelectingArea = false;

let areaCorners = [];

let searchAreaRectangle = null;

let locationMarker = null;


// =============================================
// 5. GRID VARIABLES
// =============================================

const GRID_ROWS = 4;

const GRID_COLUMNS = 4;

let gridCells = [];

let gridLabels = [];

let sectorStatuses = {};

let sectorAssignments = {};

let selectedSector = null;


const TEAM_OPTIONS = [
    "Unassigned",
    "Team 1",
    "Team 2",
    "Team 3",
    "Team 4"
];


const SECTOR_STATUS_OPTIONS = [
    "Not Searched",
    "Assigned",
    "In Progress",
    "Searched - Not Found",
    "Follow-up Required"
];


const statusColors = {

    "Not Searched": "#94a3b8",

    "Assigned": "#8b5cf6",

    "In Progress": "#eab308",

    "Searched - Not Found": "#22c55e",

    "Follow-up Required": "#ef4444"

};


// =============================================
// 6. DASHBOARD OPERATION DATA
// =============================================

// Temporary single-operation model.
// Multiple operations will be introduced
// in a future development stage.

let currentOperation = null;

const caseOperations = JSON.parse(
    localStorage.getItem("geosearch_case_operations") || "{}"
);


const DEPARTMENT_NAMES = {

    police: "Police Department",

    fire: "Fire and Rescue",

    animal: "Animal Welfare",

    disaster: "Disaster Management",

    other: "Other Departments"

};


// =============================================
// 7. OPERATION STATUS CALCULATION
// =============================================

function getCurrentOperationStatus() {
        if (!currentOperation) {
        return "none";
    }

    if (currentOperation.status === "paused") {
        return "paused";
    }

    const totalSectors =
        currentOperation.cells.length;

    const completedSectors =
        Object.values(currentOperation.statuses)
            .filter(status =>
                status === "Searched - Not Found"
            ).length;

    if (
        totalSectors > 0 &&
        completedSectors === totalSectors
    ) {

        return "completed";

    }

    return "active";

}


// =============================================
// 8. DASHBOARD SUMMARY STATISTICS
// =============================================

function updateDashboardStats() {

    // No operation registered

    if (!currentOperation) {

        activeOperationsDisplay.textContent = "0";

        totalGridsDisplay.textContent = "0";

        completedSectorsDisplay.textContent = "0";

        followUpDisplay.textContent = "0";

        return;

    }


    const statuses =
        Object.values(currentOperation.statuses);


    // Total generated sectors

    const totalSectors =
        currentOperation.cells.length;


    // Completed sectors

    const completedSectors =
        statuses.filter(status =>
            status === "Searched - Not Found"
        ).length;


    // Follow-up required sectors

    const followUpSectors =
        statuses.filter(status =>
            status === "Follow-up Required"
        ).length;


    // Determine operation status

    const operationStatus =
        getCurrentOperationStatus();


    // Active operations

    activeOperationsDisplay.textContent =
        operationStatus === "active" ? "1" : "0";


    // Number of generated grid sets

    totalGridsDisplay.textContent =
        totalSectors > 0 ? "1" : "0";


    // Completed sectors

    completedSectorsDisplay.textContent =
        completedSectors;


    // Follow-up sectors

    followUpDisplay.textContent =
        followUpSectors;

}


// =============================================
// 9. DASHBOARD MAP UPDATE
// =============================================


function updateDashboardMap() {

    // Clear previous operation layers
    dashboardOperationLayers.clearLayers();

    // Refresh statistics
    updateDashboardStats();

    // Check operation availability
    if (!currentOperation) {
        dashboardMapMessage.textContent =
            "No search operations have been registered yet.";
        return;
    }

    // Check whether bounds exist
    const bounds = currentOperation.bounds;

    if (
        !bounds ||
        !Number.isFinite(Number(bounds.south)) ||
        !Number.isFinite(Number(bounds.west)) ||
        !Number.isFinite(Number(bounds.north)) ||
        !Number.isFinite(Number(bounds.east))
    ) {
        dashboardMapMessage.textContent =
            "Search area coordinates are incomplete.";

        console.error(
            "Invalid operation bounds:",
            currentOperation.bounds
        );

        return;
    }

    // Convert coordinates into numbers
    const south = Number(bounds.south);
    const west = Number(bounds.west);
    const north = Number(bounds.north);
    const east = Number(bounds.east);

    // Validate coordinate ranges and ordering
    if (
        south < -90 || south > 90 ||
        north < -90 || north > 90 ||
        west < -180 || west > 180 ||
        east < -180 || east > 180 ||
        south >= north ||
        west >= east
    ) {
        dashboardMapMessage.textContent =
            "Search area coordinates are invalid.";

        console.error("Invalid coordinate values:", bounds);
        return;
    }

    // Department filter
    const selectedDepartment = departmentFilter.value;

    if (
        selectedDepartment !== "all" &&
        selectedDepartment !== currentOperation.department
    ) {
        dashboardMapMessage.textContent =
            "No operations found for this department.";
        return;
    }

    // Operation status filter
    const selectedStatus = operationStatusFilter.value;
    const currentStatus = getCurrentOperationStatus();

    if (
        selectedStatus !== "all" &&
        selectedStatus !== currentStatus
    ) {
        dashboardMapMessage.textContent =
            "No operations found for this status.";
        return;
    }

    // Display operation message
    dashboardMapMessage.textContent =
        "Displaying registered search operation.";

    // Create valid Leaflet bounds
    const operationBounds = L.latLngBounds(
        [south, west],
        [north, east]
    );

    // Draw operation boundary
    const operationBoundary = L.rectangle(operationBounds, {
        color: "#38bdf8",
        weight: 3,
        fillColor: "#38bdf8",
        fillOpacity: 0.12
    });

    operationBoundary.bindPopup(`
        <strong>Search Operation</strong><br>
        Department: ${
            DEPARTMENT_NAMES[currentOperation.department] ||
            currentOperation.department
        }
    `);

    dashboardOperationLayers.addLayer(operationBoundary);

    // Display generated sectors
    (currentOperation.cells || []).forEach((cell, index) => {

        if (
            !cell ||
            !Number.isFinite(Number(cell.north)) ||
            !Number.isFinite(Number(cell.south)) ||
            !Number.isFinite(Number(cell.west)) ||
            !Number.isFinite(Number(cell.east))
        ) {
            console.warn("Skipping invalid sector:", cell);
            return;
        }

        const row = Math.floor(index / GRID_COLUMNS);
        const column = index % GRID_COLUMNS;

        const sectorLabel =
            String.fromCharCode(65 + row) + (column + 1);

        const status =
            currentOperation.statuses?.[sectorLabel] ||
            "Not Searched";

        const color =
            statusColors[status] || "#64748b";

        const sectorRectangle = L.rectangle(
            [
                [Number(cell.north), Number(cell.west)],
                [Number(cell.south), Number(cell.east)]
      ],

            {
                color: color,
                fillColor: color,
                fillOpacity: 0.35,
                weight: 2
            }
        );

        sectorRectangle.bindPopup(`
            <strong>Sector ${sectorLabel}</strong><br>
            Status: ${status}
        `);

        dashboardOperationLayers.addLayer(sectorRectangle);
    });

    // Fit dashboard map to operation
    dashboardMap.fitBounds(operationBounds, {
        padding: [20, 20]
    });
}



// =============================================
// 10. DASHBOARD FILTER EVENTS
// =============================================

departmentFilter.addEventListener("change", function() {

    updateDashboardMap();

});


operationStatusFilter.addEventListener("change", function() {

    updateDashboardMap();

});


// =============================================
// 11. COMPLETE SEARCH AREA
// =============================================


function completeSearchArea() {

    const bounds = L.latLngBounds(
        areaCorners[0],
        areaCorners[1]
    );

    // Get the actual coordinate values
    const southWest = bounds.getSouthWest();
    const northEast = bounds.getNorthEast();

    // Remove previous search rectangle
    if (searchAreaRectangle !== null) {
        geoMap.removeLayer(searchAreaRectangle);
    }

    // Draw selected search area
    searchAreaRectangle = L.rectangle(bounds, {
        color: "#38bdf8",
        weight: 3,
        fillColor: "#38bdf8",
        fillOpacity: 0.15
    }).addTo(geoMap);

    // Enable grid generation
    generateGridButton.disabled = false;

    // Reset selection
    isSelectingArea = false;
    areaCorners = [];

    selectAreaButton.textContent = "Select Search Area";

    areaMessage.textContent =
        "Search area selected successfully!";

    geoMap.fitBounds(bounds);

    // Create current operation with plain coordinate values
    currentOperation = {
        department: "police",

        bounds: {
            south: southWest.lat,
            west: southWest.lng,
            north: northEast.lat,
            east: northEast.lng
        },

        cells: [],
        statuses: { ...sectorStatuses },
        status: "active"
    };

    // Save demo operation data
    if (activeDemoCaseId) {

        caseOperations[activeDemoCaseId] = {
            statuses: { ...sectorStatuses },
            assignments: { ...sectorAssignments },
            status: "active"
        };

        localStorage.setItem(
            "geosearch_case_operations",
            JSON.stringify(caseOperations)
        );
    }

    // Refresh dashboard map
    updateDashboardMap();
}


// =============================================
// 12. ADD SEARCH AREA CORNER
// =============================================

function addAreaCorner(latitude, longitude) {

    areaCorners.push([latitude, longitude]);


    if (areaCorners.length === 1) {

        areaMessage.textContent =
            "First corner selected. Click the opposite corner.";

        return;

    }


    if (areaCorners.length === 2) {

        completeSearchArea();

    }

}


// =============================================
// 13. SEARCH LOCATION
// =============================================

async function searchLocation() {

    const location =
        searchInput.value.trim();


    if (location === "") {

        searchMessage.textContent =
            "Please enter a location.";

        return;

    }


    searchMessage.textContent =
        "Searching...";

    searchButton.disabled = true;


    try {

        const apiURL =

            `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(location)}&limit=1`;


        const response =
            await fetch(apiURL);


        if (!response.ok) {

            throw new Error(
                "Location service unavailable."
            );

        }


        const data =
            await response.json();


        if (data.length === 0) {

            searchMessage.textContent =
                "Location not found. Try another place.";

            return;

        }


        const latitude =
            parseFloat(data[0].lat);

        const longitude =
            parseFloat(data[0].lon);


        // UPDATE LOCATION INFORMATION

        placeName.textContent =
            data[0].name || location;


        placeAddress.textContent =
            data[0].display_name;


        latitudeDisplay.textContent =
            latitude.toFixed(6);


        longitudeDisplay.textContent =
            longitude.toFixed(6);


        zoomLevelDisplay.textContent =
            geoMap.getZoom();


        // AREA SELECTION MODE

        if (isSelectingArea) {

            addAreaCorner(latitude, longitude);

            return;

        }


        // MOVE MAIN MAP

        geoMap.setView(

            [latitude, longitude],

            14,

            {
                animate: true
            }

        );


        // REMOVE PREVIOUS MARKER

        if (locationMarker !== null) {

            geoMap.removeLayer(locationMarker);

        }


        // ADD NEW LOCATION MARKER

        locationMarker = L.marker([
            latitude,
            longitude
        ]).addTo(geoMap);


        locationMarker.bindPopup(
            `<strong>${data[0].name || location}</strong>`
        ).openPopup();


        searchMessage.textContent =
            "Location found successfully.";

    } catch (error) {

        console.error("Location search error:", error);

        searchMessage.textContent =
            "Unable to search location. Please try again.";

    } finally {

    searchButton.disabled = false;

}
}





// =============================================
// 14. SEARCH EVENTS
// =============================================

searchButton.addEventListener("click", searchLocation);


searchInput.addEventListener("keydown", function(event) {

    if (event.key === "Enter") {

        searchLocation();

    }

});


generateGridButton.addEventListener("click", generateGrid);


// =============================================
// 15. MAIN MAP CLICK EVENT
// =============================================

geoMap.on("click", async function(event) {

    const latitude =
        event.latlng.lat;

    const longitude =
        event.latlng.lng;


    // AREA SELECTION MODE

    if (isSelectingArea) {

        addAreaCorner(latitude, longitude);

        return;

    }


    // REMOVE PREVIOUS MARKER

    if (locationMarker !== null) {

        geoMap.removeLayer(locationMarker);

    }


    // ADD NEW MARKER

    locationMarker = L.marker(

        [latitude, longitude]

    ).addTo(geoMap);


    locationMarker

        .bindPopup("Selected Map Point")

        .openPopup();


    // UPDATE LOCATION DATA

    placeName.textContent =
        "Selected Map Point";


    placeAddress.textContent =
        "Finding address...";


    latitudeDisplay.textContent =
        latitude.toFixed(6);


    longitudeDisplay.textContent =
        longitude.toFixed(6);


    zoomLevelDisplay.textContent =
        geoMap.getZoom();


    // REVERSE GEOCODING

    try {

        const reverseURL =

            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;


        const response =
            await fetch(reverseURL);


        if (!response.ok) {

            throw new Error("Address lookup failed");

        }


        const data =
            await response.json();


        placeAddress.textContent =
            data.display_name || "Address not found.";


        if (data.name) {

            placeName.textContent =
                data.name;

        }


    } catch (error) {

        console.error(
            "Reverse geocoding error:",
            error
        );


        placeAddress.textContent =
            "Unable to find address.";

    }

});


// =============================================
// 16. ZOOM LEVEL
// =============================================

geoMap.on("zoomend", function() {

    zoomLevelDisplay.textContent =
        geoMap.getZoom();

});


// =============================================
// 17. SEARCH AREA BUTTON
// =============================================

selectAreaButton.addEventListener("click", function() {

    if (isSelectingArea) {

        // CANCEL AREA SELECTION

        isSelectingArea = false;

        areaCorners = [];


        selectAreaButton.textContent =
            "Select Search Area";


        areaMessage.textContent =
            "Area selection cancelled.";


        return;

    }


    // START AREA SELECTION

    isSelectingArea = true;

    areaCorners = [];


    selectAreaButton.textContent =
        "Cancel Selection";


    areaMessage.textContent =
        "Click the first corner of your search area.";

});


// =============================================
// 18. GENERATE GRID
// =============================================



function generateGrid() {

    if (!searchAreaRectangle) {
        alert("Please select a demo area first.");
        return;
    }

    if (!activeDemoCaseId) {
        alert("Please open a demo case first.");
        return;
    }

    // Remove previous grid
    gridCells.forEach(cell => geoMap.removeLayer(cell));
    gridLabels.forEach(label => geoMap.removeLayer(label));

    gridCells = [];
    gridLabels = [];

    sectorDetailsPanel.hidden = true;
    selectedSector = null;

    // Get selected area bounds
    const bounds = searchAreaRectangle.getBounds();

    const north = bounds.getNorth();
    const south = bounds.getSouth();
    const east = bounds.getEast();
    const west = bounds.getWest();

    // Calculate cell dimensions
    const cellHeight = (north - south) / GRID_ROWS;
    const cellWidth = (east - west) / GRID_COLUMNS;

    const generatedCoordinates = [];

    // Calculate grid coordinates
    for (let row = 0; row < GRID_ROWS; row++) {

        for (let column = 0; column < GRID_COLUMNS; column++) {

            const cellNorth = north - (row * cellHeight);
            const cellSouth = cellNorth - cellHeight;

            const cellWest = west + (column * cellWidth);
            const cellEast = cellWest + cellWidth;

            generatedCoordinates.push({
                north: cellNorth,
                south: cellSouth,
                east: cellEast,
                west: cellWest
            });
        }
    }

    // Initialize sector data
    sectorStatuses = {};
    sectorAssignments = {};

    generatedCoordinates.forEach((cell, index) => {

        const row = Math.floor(index / GRID_COLUMNS);
        const column = index % GRID_COLUMNS;

        const sectorLabel =
            String.fromCharCode(65 + row) + (column + 1);

        sectorStatuses[sectorLabel] = "Not Searched";
        sectorAssignments[sectorLabel] = "Unassigned";
    });

    // Save current operation
    currentOperation = {
        department: "police",

        bounds: {
            north,
            south,
            east,
            west
        },

        cells: generatedCoordinates,
        statuses: { ...sectorStatuses },
        assignments: { ...sectorAssignments },
        status: "active"
    };

    // Draw grid immediately on main map
    drawDemoGrid();

    // Refresh Grid Guide
    updateGridGuide();

    // Refresh dashboard map
    updateDashboardMap();

    // Save operation to active case
    caseOperations[activeDemoCaseId] = {
        ...currentOperation
    };

    localStorage.setItem(
        "geosearch_case_operations",
        JSON.stringify(caseOperations)
    );

    console.log("Grid generated successfully:", currentOperation);

}



function saveActiveDemoCase() {
    if (!activeDemoCaseId || !currentOperation) return;

    caseOperations[activeDemoCaseId] = {
        department: currentOperation.department,
        bounds: currentOperation.bounds,
        cells: currentOperation.cells,
        statuses: { ...sectorStatuses },
        assignments: { ...sectorAssignments },
        status: currentOperation.status
    };

    localStorage.setItem(
        "geosearch_case_operations",
        JSON.stringify(caseOperations)
    );
}


function drawDemoGrid() {
    gridCells.forEach(cell => geoMap.removeLayer(cell));
    gridLabels.forEach(label => geoMap.removeLayer(label));

    gridCells = [];
    gridLabels = [];

    if (!currentOperation) return;

    currentOperation.cells.forEach((cell, index) => {
        const row = Math.floor(index / GRID_COLUMNS);
        const column = index % GRID_COLUMNS;

        const label = String.fromCharCode(65 + row) + (column + 1);

        const status = sectorStatuses[label] || "Not Searched";
        const color = statusColors[status];

        const rectangle = L.rectangle(
            [
                [cell.north, cell.west],
                [cell.south, cell.east]
            ],
            {
                color,
                weight: 2,
                fillColor: color,
                fillOpacity: 0.30
            }
        ).addTo(geoMap);

        rectangle.on("click", function () {
            openSectorPanel(label);
        });

        gridCells.push(rectangle);

        const centerLatitude = (cell.north + cell.south) / 2;
        const centerLongitude = (cell.east + cell.west) / 2;

        const marker = L.marker(
            [centerLatitude, centerLongitude],
            {
                interactive: false,
                icon: L.divIcon({
                    className: "grid-label",
                    html: `<span>${label}</span>`,
                    iconSize: [40, 24],
                    iconAnchor: [20, 12]
                })
            }
        ).addTo(geoMap);

        gridLabels.push(marker);
    });

    geoMap.fitBounds([
    [currentOperation.bounds.north, currentOperation.bounds.west],
    [currentOperation.bounds.south, currentOperation.bounds.east]
]);
}

// =============================================
// 19. GRID REFERENCE GUIDE
// =============================================

function updateGridGuide() {

    const container =
        document.getElementById("gridGuideContainer");


    container.innerHTML = "";


    for (
        let row = 0;
        row < GRID_ROWS;
        row++
    ) {

        for (
            let column = 0;
            column < GRID_COLUMNS;
            column++
        ) {

            const rowLabel =
                String.fromCharCode(65 + row);


            const sectorLabel =
                rowLabel + (column + 1);


            // INITIALIZE MISSING DATA

            if (!sectorStatuses[sectorLabel]) {

                sectorStatuses[sectorLabel] =
                    "Not Searched";

            }


            if (!sectorAssignments[sectorLabel]) {

                sectorAssignments[sectorLabel] =
                    "Unassigned";

            }


            // CREATE SECTOR CARD

            const sector =
                document.createElement("div");


            sector.className =
                "grid-guide-item";


            // SECTOR TITLE

            const title =
                document.createElement("strong");


            title.textContent =
                sectorLabel;


            // STATUS DROPDOWN

            const select =
                document.createElement("select");


            select.className =
                "sector-status";


            SECTOR_STATUS_OPTIONS.forEach(status => {

                const option =
                    document.createElement("option");


                option.value = status;

                option.textContent = status;


                select.appendChild(option);

            });


            select.value =
                sectorStatuses[sectorLabel];


            // STATUS CHANGE EVENT

            select.addEventListener("change", function() {

                sectorStatuses[sectorLabel] =
                    select.value;


                updateSectorColor(sectorLabel);

                updateDashboardMap();


                if (selectedSector === sectorLabel) {

                    sectorStatusSelect.value =
                        select.value;


                    sectorPanelMessage.textContent =
                        "Sector status updated.";

                }

            });


            // TEAM DROPDOWN

            const teamSelect =
                document.createElement("select");


            teamSelect.className =
                "sector-team";


            TEAM_OPTIONS.forEach(team => {

                const option =
                    document.createElement("option");


                option.value = team;

                option.textContent = team;


                teamSelect.appendChild(option);

            });


            teamSelect.value =
                sectorAssignments[sectorLabel];


            // TEAM CHANGE EVENT

            teamSelect.addEventListener("change", function() {

                sectorAssignments[sectorLabel] =
                    teamSelect.value;


                if (selectedSector === sectorLabel) {

                    sectorTeamSelect.value =
                        teamSelect.value;


                    sectorPanelMessage.textContent =
                        "Team assignment updated.";

                }

            });


            // APPEND ELEMENTS

            sector.appendChild(title);

            sector.appendChild(select);

            sector.appendChild(teamSelect);


            container.appendChild(sector);

        }

    }

}


// =============================================
// 20. OPEN SECTOR DETAILS PANEL
// =============================================

function openSectorPanel(sectorLabel) {

    selectedSector = sectorLabel;


    selectedSectorTitle.textContent =
        `Sector ${sectorLabel}`;


    // STATUS OPTIONS

    sectorStatusSelect.innerHTML = "";


    SECTOR_STATUS_OPTIONS.forEach(status => {

        const option =
            document.createElement("option");


        option.value = status;

        option.textContent = status;


        sectorStatusSelect.appendChild(option);

    });


    // TEAM OPTIONS

    sectorTeamSelect.innerHTML = "";


    TEAM_OPTIONS.forEach(team => {

        const option =
            document.createElement("option");


        option.value = team;

        option.textContent = team;


        sectorTeamSelect.appendChild(option);

    });


    // LOAD CURRENT DATA

    sectorStatusSelect.value =
        sectorStatuses[sectorLabel] || "Not Searched";


    sectorTeamSelect.value =
        sectorAssignments[sectorLabel] || "Unassigned";


    sectorPanelMessage.textContent =
        "Sector details loaded.";


    // SHOW PANEL

    sectorDetailsPanel.hidden = false;

}


// =============================================
// 21. CLOSE SECTOR PANEL
// =============================================

closeSectorPanel.addEventListener("click", function() {

    sectorDetailsPanel.hidden = true;

    selectedSector = null;

});


// =============================================
// 22. UPDATE STATUS FROM PANEL
// =============================================

sectorStatusSelect.addEventListener("change", function() {

    if (!selectedSector) return;


    sectorStatuses[selectedSector] =
        sectorStatusSelect.value;


    updateSectorColor(selectedSector);

    updateGridGuide();

    updateDashboardMap();


    sectorPanelMessage.textContent =
        "Sector status updated.";

});


// =============================================
// 23. UPDATE TEAM FROM PANEL
// =============================================

sectorTeamSelect.addEventListener("change", function() {

    if (!selectedSector) return;


    sectorAssignments[selectedSector] =
        sectorTeamSelect.value;


    updateGridGuide();


    sectorPanelMessage.textContent =
        "Team assignment updated.";

});


// =============================================
// 24. UPDATE SECTOR MAP COLOUR
// =============================================

function updateSectorColor(sectorLabel) {

    const status =
        sectorStatuses[sectorLabel];


    const color =
        statusColors[status];


    const row =
        sectorLabel.charCodeAt(0) - 65;


    const column =
        Number(sectorLabel.slice(1)) - 1;


    const index =
        row * GRID_COLUMNS + column;


    const rectangle =
        gridCells[index];


    if (rectangle && color) {

        rectangle.setStyle({

            color: color,

            fillColor: color,

            fillOpacity: 0.35,

            weight: 3

        });

    }

}


// =============================================
// 25. RESPONSIVE MAP DIMENSIONS
// =============================================

function refreshMapSizes() {

    geoMap.invalidateSize();

    dashboardMap.invalidateSize();

}


// Initial map refresh

setTimeout(refreshMapSizes, 400);


// Window resize

window.addEventListener("resize", refreshMapSizes);


// Observe main map dimensions

const mapResizeObserver =
    new ResizeObserver(() => {

        refreshMapSizes();

    });


mapResizeObserver.observe(
    document.getElementById("map")
);


mapResizeObserver.observe(
    document.getElementById("dashboardMap")
);


// =============================================
// 26. INITIAL DASHBOARD
// =============================================

// Initialize dashboard statistics

updateDashboardStats();


// Initial dashboard message

dashboardMapMessage.textContent =

    "Select a search area and generate a grid to display it here.";


// =============================================
// END OF GEOSEARCH JAVASCRIPT
// =============================================





// =====================================
// SUPABASE CONNECTION
// =====================================

const SUPABASE_URL = "https://xalfxzxqjbpddifwjlzm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_GXGJAJiSv4j4JBhyCfvdPQ_nk0TjIce";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

console.log("Supabase client initialized successfully.");







/* =====================================
   GEOSEARCH - DEMO CASE MANAGEMENT
===================================== */

const caseCreateButton = document.getElementById("createCaseButton");
const caseDialog = document.getElementById("createCaseDialog");
const caseCloseButton = document.getElementById("closeCaseDialog");
const caseCancelButton = document.getElementById("cancelCaseButton");
const caseForm = document.getElementById("createCaseForm");
const caseListContainer = document.getElementById("caseList");

const demoCases =
    JSON.parse(localStorage.getItem("geosearch_demo_cases")) || [];

function openCaseDialog() {
    caseDialog.showModal();
}

function closeCaseDialog() {
    caseDialog.close();
}


function displayDemoCases() {
    caseListContainer.replaceChildren();

    if (demoCases.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent = "No demo cases created yet.";
        caseListContainer.appendChild(emptyMessage);
        return;
    }

    demoCases.forEach(function (demoCase) {
        const card = document.createElement("article");
        card.className = "demo-case-card";

        const title = document.createElement("h3");
        title.textContent = demoCase.name;

        const description = document.createElement("p");
        description.textContent =
            demoCase.description || "No description provided.";

        const visibility = document.createElement("span");
        visibility.className = "case-visibility";
        visibility.textContent =
            demoCase.visibility === "public"
                ? "PUBLIC DEMO"
                : "PRIVATE DEMO";
        const openButton = document.createElement("button");

        openButton.type = "button";
        openButton.className = "open-case-button";
        openButton.textContent = "Open Case";
        openButton.dataset.caseId = demoCase.id;
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-case-button";
        deleteButton.textContent = "Delete Case";
        deleteButton.dataset.caseId = demoCase.id;

        card.append(
    title,
    description,
    visibility,
    openButton,
    deleteButton
);
        caseListContainer.appendChild(card);
    });
}

caseCreateButton.addEventListener("click", openCaseDialog);

caseCloseButton.addEventListener("click", closeCaseDialog);

caseCancelButton.addEventListener("click", closeCaseDialog);


caseForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const caseName = document
        .getElementById("caseNameInput")
        .value.trim();

    const caseDescription = document
        .getElementById("caseDescriptionInput")
        .value.trim();

    const caseVisibility = document
        .getElementById("caseVisibilityInput")
        .value;

    if (!caseName) {
        return;
    }

    // Generate a unique case ID with mobile compatibility
    const newCaseId =
        (window.crypto && window.crypto.randomUUID)
            ? window.crypto.randomUUID()
            : "case-" + Date.now() + "-" +
              Math.random().toString(36).slice(2);

    const newDemoCase = {
        id: newCaseId,
        name: caseName,
        description: caseDescription,
        visibility: caseVisibility
    };

    demoCases.push(newDemoCase);

    localStorage.setItem(
        "geosearch_demo_cases",
        JSON.stringify(demoCases)
    );

    displayDemoCases();

    caseForm.reset();
    closeCaseDialog();
});

displayDemoCases();




/* =====================================
   DEMO CASE LOADING AND RESET
===================================== */

let activeDemoCaseId =
    localStorage.getItem("geosearch_active_demo_case");


function clearCurrentDemoCase() {

    currentOperation = null;

    sectorStatuses = {};
    sectorAssignments = {};

    gridCells.forEach(cell => geoMap.removeLayer(cell));
    gridLabels.forEach(label => geoMap.removeLayer(label));

    gridCells = [];
    gridLabels = [];

    if (searchAreaRectangle) {
        geoMap.removeLayer(searchAreaRectangle);
        searchAreaRectangle = null;
    }

    isSelectingArea = false;
    areaCorners = [];
    selectedSector = null;

    sectorDetailsPanel.hidden = true;
    generateGridButton.disabled = true;

    const gridGuideContainer =
        document.getElementById("gridGuideContainer");

    gridGuideContainer.innerHTML = "";

    updateDashboardMap();
}


function loadDemoCase(selectedCase) {

    activeDemoCaseId = selectedCase.id;

    localStorage.setItem(
        "geosearch_active_demo_case",
        activeDemoCaseId
    );

    const selectedCaseInfo =
        document.getElementById("selectedCaseInfo");

    selectedCaseInfo.textContent =
        "Currently selected: " + selectedCase.name;

    const savedOperation =
        caseOperations[activeDemoCaseId];

    if (searchAreaRectangle) {
        geoMap.removeLayer(searchAreaRectangle);
        searchAreaRectangle = null;
    }

    // No saved operation for this case
    if (
        !savedOperation ||
        !savedOperation.bounds ||
        !Array.isArray(savedOperation.cells)
    ) {

        clearCurrentDemoCase();

        return;
    }

    // Restore sector data
    sectorStatuses = {
        ...(savedOperation.statuses || {})
    };

    sectorAssignments = {
        ...(savedOperation.assignments || {})
    };

    currentOperation = {
        ...savedOperation,
        statuses: sectorStatuses,
        assignments: sectorAssignments
    };

    // Restore search area
    const bounds = savedOperation.bounds;

    searchAreaRectangle = L.rectangle(
        [
            [Number(bounds.south), Number(bounds.west)],
            [Number(bounds.north), Number(bounds.east)]
        ],
        {
            color: "#38bdf8",
            weight: 3,
            fillColor: "#38bdf8",
            fillOpacity: 0.15
        }
    ).addTo(geoMap);

    generateGridButton.disabled = false;

    // Restore grid and dashboard
    drawDemoGrid();

    updateGridGuide();

    updateDashboardMap();

    console.log("Opened demo case:", selectedCase.name);
}


/* =====================================
   DEMO CASE CLICK HANDLER
===================================== */

caseListContainer.addEventListener("click", function (event) {

    const button = event.target.closest("button");

    if (!button) return;

    const caseId = button.dataset.caseId;

    // DELETE CASE
    if (button.matches(".delete-case-button")) {

        const confirmed = confirm(
            "Delete this fictional demo case?"
        );

        if (!confirmed) return;

        const caseIndex = demoCases.findIndex(
            demoCase => demoCase.id === caseId
        );

        if (caseIndex === -1) return;

        demoCases.splice(caseIndex, 1);

        delete caseOperations[caseId];

        localStorage.setItem(
            "geosearch_demo_cases",
            JSON.stringify(demoCases)
        );

        localStorage.setItem(
            "geosearch_case_operations",
            JSON.stringify(caseOperations)
        );

        // Reset if the deleted case was active
        if (activeDemoCaseId === caseId) {

            activeDemoCaseId = null;

            localStorage.removeItem(
                "geosearch_active_demo_case"
            );

            clearCurrentDemoCase();

            document.getElementById(
                "selectedCaseInfo"
            ).textContent = "No case selected.";
        }

        displayDemoCases();

        return;
    }

    // OPEN CASE
    if (button.matches(".open-case-button")) {

        const selectedCase = demoCases.find(
            demoCase => demoCase.id === caseId
        );

        if (!selectedCase) return;

        // Save previous case before switching
        if (activeDemoCaseId !== selectedCase.id) {
            saveActiveDemoCase();
        }

        loadDemoCase(selectedCase);
    }

});


/* =====================================
   RESTORE SELECTED DEMO CASE
===================================== */

const savedCase = demoCases.find(
    demoCase => demoCase.id === activeDemoCaseId
);

if (savedCase) {

    loadDemoCase(savedCase);

} else {

    activeDemoCaseId = null;

    localStorage.removeItem(
        "geosearch_active_demo_case"
    );

    clearCurrentDemoCase();

    document.getElementById(
        "selectedCaseInfo"
    ).textContent = "No case selected.";
}




/* =====================================
   GEOSEARCH — MOBILE NAVIGATION
===================================== */

const mobileMenuButton =
    document.getElementById("mobileMenuButton");

const mainNavigation =
    document.getElementById("mainNavigation");


function closeMobileMenu() {

    mainNavigation.classList.remove("is-open");

    mobileMenuButton.setAttribute(
        "aria-expanded",
        "false"
    );

    mobileMenuButton.setAttribute(
        "aria-label",
        "Open navigation menu"
    );

}


mobileMenuButton.addEventListener("click", function () {

    const isOpen =
        mainNavigation.classList.toggle("is-open");

    mobileMenuButton.setAttribute(
        "aria-expanded",
        String(isOpen)
    );

    mobileMenuButton.setAttribute(
        "aria-label",
        isOpen ? "Close navigation menu" : "Open navigation menu"
    );

});


// Close after selecting a navigation link

mainNavigation.querySelectorAll("a").forEach(link => {

    link.addEventListener("click", closeMobileMenu);

});


// Close when clicking outside the menu

document.addEventListener("click", function(event) {

    if (
        !mainNavigation.contains(event.target) &&
        !mobileMenuButton.contains(event.target)
    ) {
        closeMobileMenu();
    }

});


// Close using Escape

document.addEventListener("keydown", function(event) {

    if (event.key === "Escape") {
        closeMobileMenu();
    }

});


// Reset menu when returning to desktop

window.addEventListener("resize", function() {

    if (window.innerWidth > 600) {
        closeMobileMenu();
    }

});





/* =====================================
   GEOSEARCH — SUPABASE AUTHENTICATION
===================================== */

const authScreen = document.getElementById("authScreen");
const appShell = document.getElementById("appShell");

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const authMessage = document.getElementById("authMessage");

const showSignupButton = document.getElementById("showSignupButton");
const showLoginButton = document.getElementById("showLoginButton");
const forgotPasswordButton = document.getElementById("forgotPasswordButton");

function showAuthMessage(message, isError = false) {
    authMessage.textContent = message;
    authMessage.style.color = isError ? "#f87171" : "#7dd3fc";
}

function showLoginScreen() {
    loginForm.hidden = false;
    signupForm.hidden = true;

    authTitle.textContent = "Welcome Back";
    authSubtitle.textContent = "Sign in to access your command centre.";

    showAuthMessage("");
}

function showSignupScreen() {
    loginForm.hidden = true;
    signupForm.hidden = false;

    authTitle.textContent = "Create Account";
    authSubtitle.textContent = "Register to access GeoSearch.";

    showAuthMessage("");
}

function showApplication(user) {
    authScreen.hidden = true;
    appShell.hidden = false;

    console.log("GeoSearch authenticated:", user.email);

    // Refresh Leaflet maps after revealing the dashboard.
    setTimeout(() => {
        if (typeof refreshMapSizes === "function") {
            refreshMapSizes();
        }
    }, 300);
}

// Switch between login and signup.
showSignupButton.addEventListener("click", showSignupScreen);
showLoginButton.addEventListener("click", showLoginScreen);

// LOGIN
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    const submitButton = loginForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    showAuthMessage("Signing in...");

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        showAuthMessage("Login successful.");

        if (data.user) {
            showApplication(data.user);
        }

    } catch (error) {
        showAuthMessage(error.message, true);
    } finally {
        submitButton.disabled = false;
    }
});

// SIGN UP
signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {
        showAuthMessage("Passwords do not match.", true);
        return;
    }

    const submitButton = signupForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    showAuthMessage("Creating your account...");

    try {
        const { data, error } = await supabaseClient.auth.signUp({
    email,
    password
});

console.log("SIGNUP RESPONSE:", data);
console.log("SIGNUP ERROR:", error);

if (error) throw error;

        if (data.session && data.user) {
            showApplication(data.user);
        } else {
            showAuthMessage(
                "Account created. Check your email to confirm your account, then sign in."
            );
            showLoginScreen();
        }

    } catch (error) {
        showAuthMessage(error.message, true);
    } finally {
        submitButton.disabled = false;
    }
});

// FORGOT PASSWORD
forgotPasswordButton.addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value.trim();

    if (!email) {
        showAuthMessage("Enter your email address first.", true);
        return;
    }

    showAuthMessage("Sending password recovery email...");

    try {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email);

        if (error) throw error;

        showAuthMessage("If the account exists, a recovery email has been sent.");

    } catch (error) {
        showAuthMessage(error.message, true);
    }
});

// RESTORE EXISTING SESSION
async function restoreAuthSession() {
    try {
        const { data, error } = await supabaseClient.auth.getSession();

        if (error) throw error;

        if (data.session) {
            showApplication(data.session.user);
        } else {
            authScreen.hidden = false;
            appShell.hidden = true;
        }

    } catch (error) {
        console.error("Session restoration failed:", error);
        authScreen.hidden = false;
        appShell.hidden = true;
        showAuthMessage("Unable to restore session. Please sign in.", true);
    }
}

restoreAuthSession();

// LISTEN FOR AUTH CHANGES
supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
        appShell.hidden = true;
        authScreen.hidden = false;
        showLoginScreen();
    }

    if (event === "SIGNED_IN" && session?.user) {
        showApplication(session.user);
    }
});





/* GEOSEARCH LOGOUT BUTTON */

const logoutButton = document.getElementById("logoutButton");

logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    logoutButton.textContent = "Logging out...";

    try {
        const { error } = await supabaseClient.auth.signOut();

        if (error) throw error;

        // The existing SIGNED_OUT listener
        // will return the user to the login screen.

    } catch (error) {
        console.error("Logout failed:", error);
        alert("Unable to log out. Please try again.");
        logoutButton.disabled = false;
        logoutButton.textContent = "Log Out";
    }
});
