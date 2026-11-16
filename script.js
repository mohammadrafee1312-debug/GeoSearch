
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


    // Always refresh statistics

    updateDashboardStats();


    // Check operation availability

    if (!currentOperation) {

        dashboardMapMessage.textContent =
            "No search operations have been registered yet.";

        return;

    }


    // DEPARTMENT FILTER

    const selectedDepartment =
        departmentFilter.value;


    if (
        selectedDepartment !== "all" &&
        selectedDepartment !== currentOperation.department
    ) {

        dashboardMapMessage.textContent =
            "No operations found for this department.";

        return;

    }


    // OPERATION STATUS FILTER

    const selectedStatus =
        operationStatusFilter.value;


    const currentStatus =
        getCurrentOperationStatus();


    if (
        selectedStatus !== "all" &&
        selectedStatus !== currentStatus
    ) {

        dashboardMapMessage.textContent =
            "No operations found for this status.";

        return;

    }


    // DISPLAY OPERATION MESSAGE

    dashboardMapMessage.textContent =
        "Displaying registered search operation.";


    const bounds =
        currentOperation.bounds;


    // DRAW OPERATION BOUNDARY

    const operationBoundary = L.rectangle(bounds, {

        color: "#38bdf8",

        weight: 3,

        fillColor: "#38bdf8",

        fillOpacity: 0.12

    });


    operationBoundary.bindPopup(

        `<strong>Search Operation</strong><br>
        Department: ${DEPARTMENT_NAMES[currentOperation.department]}`

    );


    dashboardOperationLayers.addLayer(operationBoundary);


    // DISPLAY GENERATED SECTORS

    currentOperation.cells.forEach((cell, index) => {

        const row =
            Math.floor(index / GRID_COLUMNS);

        const column =
            index % GRID_COLUMNS;


        const sectorLabel =
            String.fromCharCode(65 + row) + (column + 1);


        const status =
            currentOperation.statuses[sectorLabel] ||
            "Not Searched";


        const color =
            statusColors[status];


        const sectorRectangle = L.rectangle(

            [
                [cell.north, cell.west],
                [cell.south, cell.east]
            ],

            {

                color: color,

                fillColor: color,

                fillOpacity: 0.35,

                weight: 2

            }

        );


        sectorRectangle.bindPopup(

            `<strong>Sector ${sectorLabel}</strong><br>
            Status: ${status}`

        );


        dashboardOperationLayers.addLayer(sectorRectangle);

    });


    // FIT DASHBOARD MAP TO OPERATION

    dashboardMap.fitBounds(bounds, {

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


    selectAreaButton.textContent =
        "Select Search Area";


    areaMessage.textContent =
        "Search area selected successfully!";


    geoMap.fitBounds(bounds);


    // Create current operation

    currentOperation = {

        department: "police",

        bounds: bounds,

        cells: [],

        statuses: sectorStatuses,

        status: "active"

    };


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


        // ADD NEW MARKER

        locationMarker = L.marker(

            [latitude, longitude]

        ).addTo(geoMap);


        locationMarker

            .bindPopup(
                `<b>${data[0].display_name}</b>`
            )

            .openPopup();


        searchMessage.textContent =
            "Location found successfully!";


    } catch (error) {

        console.error(
            "Search error:",
            error
        );


        searchMessage.textContent =
            "Something went wrong. Check your internet connection.";

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

        alert(
            "Please select a search area first."
        );

        return;

    }


    // REMOVE PREVIOUS GRID

    gridCells.forEach(cell => {

        geoMap.removeLayer(cell);

    });


    gridLabels.forEach(label => {

        geoMap.removeLayer(label);

    });


    gridCells = [];

    gridLabels = [];


    // RESET SECTOR DATA

    sectorStatuses = {};

    sectorAssignments = {};


    sectorDetailsPanel.hidden = true;

    selectedSector = null;


    // GET SELECTED AREA BOUNDS

    const bounds =
        searchAreaRectangle.getBounds();


    const north =
        bounds.getNorth();

    const south =
        bounds.getSouth();

    const east =
        bounds.getEast();

    const west =
        bounds.getWest();


    // CALCULATE CELL DIMENSIONS

    const cellHeight =
        (north - south) / GRID_ROWS;

    const cellWidth =
        (east - west) / GRID_COLUMNS;


    const generatedCoordinates = [];


    // CALCULATE GRID COORDINATES

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

            const cellNorth =
                north - (row * cellHeight);

            const cellSouth =
                cellNorth - cellHeight;


            const cellWest =
                west + (column * cellWidth);

            const cellEast =
                cellWest + cellWidth;


            generatedCoordinates.push({

                north: cellNorth,

                south: cellSouth,

                east: cellEast,

                west: cellWest

            });

        }

    }


    // DRAW GRID CELLS

    generatedCoordinates.forEach((cell, index) => {

        const row =
            Math.floor(index / GRID_COLUMNS);

        const column =
            index % GRID_COLUMNS;


        const rowLabel =
            String.fromCharCode(65 + row);


        const sectorLabel =
            rowLabel + (column + 1);


        // INITIAL SECTOR DATA

        sectorStatuses[sectorLabel] =
            "Not Searched";


        sectorAssignments[sectorLabel] =
            "Unassigned";


        // CREATE SECTOR RECTANGLE

        const rectangle = L.rectangle(

            [
                [cell.north, cell.west],

                [cell.south, cell.east]
            ],

            {

                color: statusColors["Not Searched"],

                weight: 2,

                fillColor: statusColors["Not Searched"],

                fillOpacity: 0.30

            }

        ).addTo(geoMap);


        gridCells.push(rectangle);


        // SECTOR CLICK EVENT

        rectangle.on("click", function() {

            openSectorPanel(sectorLabel);

        });


        // CALCULATE SECTOR CENTRE

        const centerLatitude =

            (cell.north + cell.south) / 2;


        const centerLongitude =

            (cell.east + cell.west) / 2;


        // CREATE SECTOR LABEL

        const label = L.marker(

            [centerLatitude, centerLongitude],

            {

                interactive: false,

                icon: L.divIcon({

                    className: "grid-label",

                    html: `<span>${sectorLabel}</span>`,

                    iconSize: [40, 24],

                    iconAnchor: [20, 12]

                })

            }

        ).addTo(geoMap);


        gridLabels.push(label);

    });


    // SAVE CURRENT OPERATION

    currentOperation = {

        department: "police",

        bounds: bounds,

        cells: generatedCoordinates,

        statuses: sectorStatuses,

        status: "active"

    };


    // UPDATE INTERFACE

    updateGridGuide();

    updateDashboardMap();

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
