/* ===================================
   FUEL MILEAGE TRACKER
   APP.JS - PART 3A
=================================== */

/* ---------- STORAGE KEYS ---------- */

const STORAGE_KEYS = {
    VEHICLES: "fuel_tracker_vehicles",
    RECORDS: "fuel_tracker_records",
    ACTIVE_VEHICLE: "fuel_tracker_active_vehicle"
};

/* ---------- APP STATE ---------- */

let vehicles = [];
let records = [];
let activeVehicleId = null;

/* ---------- DOM ---------- */

const pages = document.querySelectorAll(".page");
const menuItems = document.querySelectorAll(".sidebar li");

const vehicleModal =
    document.getElementById("vehicleModal");

const vehicleProfileBtn =
    document.getElementById("vehicleProfileBtn");

const closeVehicleModal =
    document.querySelector(".closeVehicleModal");

const vehicleSelect =
    document.getElementById("vehicleSelect");

const saveVehicleBtn =
    document.getElementById("saveVehicle");

const vehicleName =
    document.getElementById("vehicleName");

const vehicleNumber =
    document.getElementById("vehicleNumber");

const vehicleType =
    document.getElementById("vehicleType");

const fuelType =
    document.getElementById("fuelType");

const mobileMenu =
    document.getElementById("mobileMenu");

const sidebar =
    document.getElementById("sidebar");

/* ===================================
   INIT
=================================== */

document.addEventListener("DOMContentLoaded", () => {

    loadData();

    initNavigation();

    initMobileMenu();

    initVehicleEvents();

    populateVehicleDropdown();

    updateDashboard();

});

/* ===================================
   LOCAL STORAGE
=================================== */

function loadData() {

    vehicles =
        JSON.parse(
            localStorage.getItem(
                STORAGE_KEYS.VEHICLES
            )
        ) || [];

    records =
        JSON.parse(
            localStorage.getItem(
                STORAGE_KEYS.RECORDS
            )
        ) || [];

    activeVehicleId =
        localStorage.getItem(
            STORAGE_KEYS.ACTIVE_VEHICLE
        ) || null;
}

function saveVehicles() {

    localStorage.setItem(
        STORAGE_KEYS.VEHICLES,
        JSON.stringify(vehicles)
    );

}

function saveRecords() {

    localStorage.setItem(
        STORAGE_KEYS.RECORDS,
        JSON.stringify(records)
    );

}

function saveActiveVehicle() {

    localStorage.setItem(
        STORAGE_KEYS.ACTIVE_VEHICLE,
        activeVehicleId
    );

}

/* ===================================
   NAVIGATION
=================================== */

function initNavigation() {

    menuItems.forEach(item => {

        item.addEventListener("click", () => {

            menuItems.forEach(i =>
                i.classList.remove("active")
            );

            item.classList.add("active");

            const page =
                item.dataset.page;

            pages.forEach(p =>
                p.classList.remove("active")
            );

            document
                .getElementById(page)
                .classList.add("active");

            sidebar.classList.remove("show");

        });

    });

}

/* ===================================
   MOBILE MENU
=================================== */

function initMobileMenu() {

    mobileMenu.addEventListener("click", () => {

        sidebar.classList.toggle("show");

    });

}

/* ===================================
   VEHICLE MODAL
=================================== */

function initVehicleEvents() {

    vehicleProfileBtn.addEventListener(
        "click",
        openVehicleModal
    );

    closeVehicleModal.addEventListener(
        "click",
        closeVehiclePopup
    );

    saveVehicleBtn.addEventListener(
        "click",
        saveVehicle
    );

    vehicleSelect.addEventListener(
        "change",
        handleVehicleChange
    );

}

/* ===================================
   VEHICLE MODAL OPEN
=================================== */

function openVehicleModal() {

    vehicleModal.classList.add("show");

    const vehicle =
        getActiveVehicle();

    if (!vehicle) {

        clearVehicleForm();
        return;
    }

    vehicleName.value =
        vehicle.name || "";

    vehicleNumber.value =
        vehicle.number || "";

    vehicleType.value =
        vehicle.type || "Bike";

    fuelType.value =
        vehicle.fuel || "Petrol";

}

/* ===================================
   CLOSE MODAL
=================================== */

function closeVehiclePopup() {

    vehicleModal.classList.remove("show");

}

/* ===================================
   CLEAR FORM
=================================== */

function clearVehicleForm() {

    vehicleName.value = "";
    vehicleNumber.value = "";
    vehicleType.value = "Bike";
    fuelType.value = "Petrol";

}

/* ===================================
   SAVE VEHICLE
=================================== */

function saveVehicle() {

    const name =
        vehicleName.value.trim();

    const number =
        vehicleNumber.value.trim();

    if (!name) {

        alert(
            "Please enter vehicle name"
        );

        return;
    }

    if (!number) {

        alert(
            "Please enter vehicle number"
        );

        return;
    }

    const existingVehicle =
        getActiveVehicle();

    if (existingVehicle) {

        existingVehicle.name = name;
        existingVehicle.number = number;
        existingVehicle.type =
            vehicleType.value;

        existingVehicle.fuel =
            fuelType.value;

    } else {

        const vehicle = {

            id:
                "VH-" +
                Date.now(),

            name,

            number,

            type:
                vehicleType.value,

            fuel:
                fuelType.value,

            created:
                new Date().toISOString()

        };

        vehicles.push(vehicle);

        activeVehicleId =
            vehicle.id;

        saveActiveVehicle();

    }

    saveVehicles();

    populateVehicleDropdown();

    closeVehiclePopup();

    updateDashboard();

}

/* ===================================
   ACTIVE VEHICLE
=================================== */

function getActiveVehicle() {

    return vehicles.find(
        v => v.id === activeVehicleId
    );

}

/* ===================================
   VEHICLE DROPDOWN
=================================== */

function populateVehicleDropdown() {

    vehicleSelect.innerHTML = "";

    if (vehicles.length === 0) {

        const option =
            document.createElement(
                "option"
            );

        option.textContent =
            "Unnamed Vehicle";

        vehicleSelect.appendChild(
            option
        );

        return;
    }

    vehicles.forEach(vehicle => {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            vehicle.id;

        option.textContent =
            `${vehicle.name} (${vehicle.number})`;

        if (
            vehicle.id ===
            activeVehicleId
        ) {

            option.selected = true;

        }

        vehicleSelect.appendChild(
            option
        );

    });

}

/* ===================================
   VEHICLE CHANGE
=================================== */

function handleVehicleChange() {

    activeVehicleId =
        vehicleSelect.value;

    saveActiveVehicle();

    updateDashboard();

}

/* ===================================
   ADD VEHICLE PROGRAMMATICALLY
=================================== */

function addVehicle(data) {

    const vehicle = {

        id:
            "VH-" +
            Date.now(),

        name:
            data.name,

        number:
            data.number,

        type:
            data.type,

        fuel:
            data.fuel,

        created:
            new Date()
            .toISOString()

    };

    vehicles.push(vehicle);

    activeVehicleId =
        vehicle.id;

    saveVehicles();

    saveActiveVehicle();

    populateVehicleDropdown();

}

/* ===================================
   DELETE VEHICLE
=================================== */

function deleteVehicle(id) {

    const confirmDelete =
        confirm(
            "Delete this vehicle?"
        );

    if (!confirmDelete)
        return;

    vehicles =
        vehicles.filter(
            v => v.id !== id
        );

    records =
        records.filter(
            r =>
            r.vehicleId !== id
        );

    saveVehicles();

    saveRecords();

    if (
        vehicles.length > 0
    ) {

        activeVehicleId =
            vehicles[0].id;

    } else {

        activeVehicleId =
            null;

    }

    saveActiveVehicle();

    populateVehicleDropdown();

    updateDashboard();

}

/* ===================================
   DASHBOARD PLACEHOLDER
   (Part 3B will complete)
=================================== */

function updateDashboard() {

    // Completed in Part 3B

}

/* ===================================
   RECORD TABLE PLACEHOLDER
=================================== */

function renderRecords() {

    // Completed in Part 3B

}// your code goes here
/* ===================================
   RECORD MODAL ELEMENTS
=================================== */

const recordModal =
    document.getElementById("recordModal");

const addRecordBtn =
    document.getElementById("addRecordBtn");

const calculateBtn =
    document.getElementById("calculateBtn");

const saveRecordBtn =
    document.getElementById("saveRecord");

const closeRecordModal =
    document.querySelector(".closeModal");

const recordVehicle =
    document.getElementById("recordVehicle");

const startKm =
    document.getElementById("startKm");

const endKm =
    document.getElementById("endKm");

const fuelLitres =
    document.getElementById("fuelLitres");

const fuelCost =
    document.getElementById("fuelCost");

const recordsTable =
    document.getElementById("recordsTable");

/* Preview */

const previewMileage =
    document.getElementById("previewMileage");

const previewCostPerKm =
    document.getElementById("previewCostPerKm");

const previewKmPerRupee =
    document.getElementById("previewKmPerRupee");

/* Dashboard */

const currentMileage =
    document.getElementById("currentMileage");

const averageMileage =
    document.getElementById("averageMileage");

const bestMileage =
    document.getElementById("bestMileage");

const worstMileage =
    document.getElementById("worstMileage");

const last30Distance =
    document.getElementById("last30Distance");

const last30Fuel =
    document.getElementById("last30Fuel");

const last30Cost =
    document.getElementById("last30Cost");

const totalRecords =
    document.getElementById("totalRecords");

const costPerKm =
    document.getElementById("costPerKm");

const kmPerRupee =
    document.getElementById("kmPerRupee");

/* ===================================
   INITIALIZE RECORD EVENTS
=================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        addRecordBtn?.addEventListener(
            "click",
            openRecordModal
        );

        closeRecordModal?.addEventListener(
            "click",
            closeRecordPopup
        );

        calculateBtn?.addEventListener(
            "click",
            calculatePreview
        );

        saveRecordBtn?.addEventListener(
            "click",
            saveRecord
        );

        renderRecords();

    }
);

/* ===================================
   RECORD MODAL
=================================== */

function openRecordModal() {

    if (vehicles.length === 0) {

        alert(
            "Please create a vehicle first."
        );

        return;
    }

    recordVehicle.innerHTML = "";

    vehicles.forEach(vehicle => {

        const option =
            document.createElement(
                "option"
            );

        option.value = vehicle.id;

        option.textContent =
            `${vehicle.name} (${vehicle.number})`;

        if (
            vehicle.id === activeVehicleId
        ) {
            option.selected = true;
        }

        recordVehicle.appendChild(
            option
        );
    });

    clearRecordForm();

    recordModal.classList.add(
        "show"
    );
}

function closeRecordPopup() {

    recordModal.classList.remove(
        "show"
    );
}

function clearRecordForm() {

    startKm.value = "";
    endKm.value = "";
    fuelLitres.value = "";
    fuelCost.value = "";

    previewMileage.textContent =
        "0 KM/L";

    previewCostPerKm.textContent =
        "₹0";

    previewKmPerRupee.textContent =
        "0";
}

/* ===================================
   CALCULATE PREVIEW
=================================== */

function calculatePreview() {

    const start =
        Number(startKm.value);

    const end =
        Number(endKm.value);

    const litres =
        Number(fuelLitres.value);

    const cost =
        Number(fuelCost.value);

    if (
        !start ||
        !end ||
        !litres ||
        !cost
    ) {

        alert(
            "Please fill all fields."
        );

        return;
    }

    const distance =
        end - start;

    if (distance <= 0) {

        alert(
            "Ending KM must be greater than Starting KM"
        );

        return;
    }

    const mileage =
        distance / litres;

    const costKm =
        cost / distance;

    const kmRupee =
        distance / cost;

    previewMileage.textContent =
        mileage.toFixed(2) +
        " KM/L";

    previewCostPerKm.textContent =
        "₹" +
        costKm.toFixed(2);

    previewKmPerRupee.textContent =
        kmRupee.toFixed(3);
}

/* ===================================
   SAVE RECORD
=================================== */

function saveRecord() {

    const start =
        Number(startKm.value);

    const end =
        Number(endKm.value);

    const litres =
        Number(fuelLitres.value);

    const cost =
        Number(fuelCost.value);

    const vehicleId =
        recordVehicle.value;

    const distance =
        end - start;

    if (
        distance <= 0
    ) {

        alert(
            "Invalid KM range"
        );

        return;
    }

    const mileage =
        distance / litres;

    const costKm =
        cost / distance;

    const kmRupee =
        distance / cost;

    const record = {

        id:
            "REC-" +
            Date.now(),

        vehicleId,

        startKm: start,

        endKm: end,

        distance,

        fuelLitres: litres,

        fuelCost: cost,

        mileage,

        costPerKm: costKm,

        kmPerRupee: kmRupee,

        created:
            new Date()
            .toISOString()

    };

    records.push(record);

    saveRecords();

    renderRecords();

    updateDashboard();

    closeRecordPopup();
}

/* ===================================
   RENDER RECORDS
=================================== */

function renderRecords() {

    if (!recordsTable)
        return;

    const filteredRecords =
        records.filter(
            r =>
            r.vehicleId ===
            activeVehicleId
        );

    if (
        filteredRecords.length === 0
    ) {

        recordsTable.innerHTML = `
        <tr>
            <td colspan="10">
                No Records Found
            </td>
        </tr>
        `;

        return;
    }

    recordsTable.innerHTML = "";

    filteredRecords
    .sort((a,b)=>
        new Date(b.created) -
        new Date(a.created)
    )
    .forEach(record => {

        const vehicle =
            vehicles.find(
                v =>
                v.id ===
                record.vehicleId
            );

        const row =
            document.createElement(
                "tr"
            );

        row.innerHTML = `
            <td>
                ${new Date(record.created)
                    .toLocaleDateString()}
            </td>

            <td>
                ${vehicle?.name || '-'}
            </td>

            <td>
                ${record.startKm}
            </td>

            <td>
                ${record.endKm}
            </td>

            <td>
                ${record.distance}
            </td>

            <td>
                ${record.fuelLitres}
            </td>

            <td>
                ₹${record.fuelCost}
            </td>

            <td>
                ${record.mileage.toFixed(2)}
            </td>

            <td>
                ₹${record.costPerKm.toFixed(2)}
            </td>

            <td>
                <button
                class="btn btn-danger"
                onclick="deleteRecord('${record.id}')">
                Delete
                </button>
            </td>
        `;

        recordsTable.appendChild(
            row
        );

    });
}

/* ===================================
   DELETE RECORD
=================================== */

function deleteRecord(id) {

    if (
        !confirm(
            "Delete this record?"
        )
    ) return;

    records =
        records.filter(
            r => r.id !== id
        );

    saveRecords();

    renderRecords();

    updateDashboard();
}

/* ===================================
   DASHBOARD
=================================== */

function updateDashboard() {

    const vehicleRecords =
        records.filter(
            r =>
            r.vehicleId ===
            activeVehicleId
        );

    renderRecords();

    if (
        vehicleRecords.length === 0
    ) {

        currentMileage.textContent =
            "0 KM/L";

        averageMileage.textContent =
            "0 KM/L";

        bestMileage.textContent =
            "0 KM/L";

        worstMileage.textContent =
            "0 KM/L";

        last30Distance.textContent =
            "0 KM";

        last30Fuel.textContent =
            "0 L";

        last30Cost.textContent =
            "₹0";

        totalRecords.textContent =
            "0";

        costPerKm.textContent =
            "₹0";

        kmPerRupee.textContent =
            "0";

        return;
    }

    const latest =
        vehicleRecords[
            vehicleRecords.length - 1
        ];

    const mileages =
        vehicleRecords.map(
            r => r.mileage
        );

    const avgMileage =
        mileages.reduce(
            (a,b)=>a+b,0
        ) / mileages.length;

    const best =
        Math.max(...mileages);

    const worst =
        Math.min(...mileages);

    currentMileage.textContent =
        latest.mileage.toFixed(2)
        + " KM/L";

    averageMileage.textContent =
        avgMileage.toFixed(2)
        + " KM/L";

    bestMileage.textContent =
        best.toFixed(2)
        + " KM/L";

    worstMileage.textContent =
        worst.toFixed(2)
        + " KM/L";

    totalRecords.textContent =
        vehicleRecords.length;

    /* Last 30 Days */

    const last30 =
        vehicleRecords.filter(r => {

            const diff =
                Date.now() -
                new Date(
                    r.created
                ).getTime();

            return (
                diff <=
                30 * 24 * 60 * 60 * 1000
            );

        });

    const totalDistance =
        last30.reduce(
            (sum,r)=>
            sum+r.distance,
            0
        );

    const totalFuel =
        last30.reduce(
            (sum,r)=>
            sum+r.fuelLitres,
            0
        );

    const totalCostValue =
        last30.reduce(
            (sum,r)=>
            sum+r.fuelCost,
            0
        );

    last30Distance.textContent =
        totalDistance.toFixed(0)
        + " KM";

    last30Fuel.textContent =
        totalFuel.toFixed(2)
        + " L";

    last30Cost.textContent =
        "₹" +
        totalCostValue.toFixed(0);

    const overallCostKm =
        totalDistance > 0
        ? totalCostValue /
          totalDistance
        : 0;

    const overallKmRupee =
        totalCostValue > 0
        ? totalDistance /
          totalCostValue
        : 0;

    costPerKm.textContent =
        "₹" +
        overallCostKm.toFixed(2);

    kmPerRupee.textContent =
        overallKmRupee.toFixed(3);
}

/* ===================================
   PART 4
   EXPORT / IMPORT / BACKUP
=================================== */

const exportExcelBtn =
    document.getElementById("exportExcel");

const exportPDFBtn =
    document.getElementById("exportPDF");

const exportJsonBtn =
    document.getElementById("exportJson");

const importJsonInput =
    document.getElementById("importJson");

const deleteAllBtn =
    document.getElementById("deleteAllData");

/* ===================================
   EVENTS
=================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        exportExcelBtn?.addEventListener(
            "click",
            exportExcel
        );

        exportPDFBtn?.addEventListener(
            "click",
            exportPDF
        );

        exportJsonBtn?.addEventListener(
            "click",
            exportJSON
        );

        importJsonInput?.addEventListener(
            "change",
            importJSON
        );

        deleteAllBtn?.addEventListener(
            "click",
            deleteAllData
        );

    }
);

/* ===================================
   EXPORT EXCEL
=================================== */

function exportExcel() {

    const vehicle =
        getActiveVehicle();

    if (!vehicle) {

        alert(
            "Select vehicle first."
        );

        return;
    }

    const vehicleRecords =
        records.filter(
            r =>
            r.vehicleId ===
            vehicle.id
        );

    if (
        vehicleRecords.length === 0
    ) {

        alert(
            "No records available."
        );

        return;
    }

    const excelData =
        vehicleRecords.map(r => ({

            Date:
                new Date(
                    r.created
                ).toLocaleDateString(),

            Vehicle:
                vehicle.name,

            "Vehicle Number":
                vehicle.number,

            "Start KM":
                r.startKm,

            "End KM":
                r.endKm,

            Distance:
                r.distance,

            "Fuel (L)":
                r.fuelLitres,

            "Fuel Cost":
                r.fuelCost,

            Mileage:
                r.mileage.toFixed(2),

            "Cost/KM":
                r.costPerKm.toFixed(2),

            "KM/Rupee":
                r.kmPerRupee.toFixed(3)

        }));

    const worksheet =
        XLSX.utils.json_to_sheet(
            excelData
        );

    const workbook =
        XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Mileage Records"
    );

    XLSX.writeFile(
        workbook,
        `${vehicle.name}_Mileage.xlsx`
    );

}

/* ===================================
   PDF EXPORT
=================================== */

async function exportPDF() {

    const vehicle =
        getActiveVehicle();

    if (!vehicle) {

        alert(
            "Select vehicle first."
        );

        return;
    }

    const vehicleRecords =
        records.filter(
            r =>
            r.vehicleId ===
            vehicle.id
        );

    if (
        vehicleRecords.length === 0
    ) {

        alert(
            "No records found."
        );

        return;
    }

    const { jsPDF } =
        window.jspdf;

    const doc =
        new jsPDF();

    let y = 15;

    doc.setFontSize(18);

    doc.text(
        "Fuel Mileage Report",
        15,
        y
    );

    y += 12;

    doc.setFontSize(11);

    doc.text(
        `Vehicle : ${vehicle.name}`,
        15,
        y
    );

    y += 7;

    doc.text(
        `Number : ${vehicle.number}`,
        15,
        y
    );

    y += 7;

    doc.text(
        `Type : ${vehicle.type}`,
        15,
        y
    );

    y += 7;

    doc.text(
        `Fuel : ${vehicle.fuel}`,
        15,
        y
    );

    y += 15;

    /* Dashboard Stats */

    const mileages =
        vehicleRecords.map(
            r => r.mileage
        );

    const avg =
        mileages.reduce(
            (a,b)=>a+b,0
        ) / mileages.length;

    const best =
        Math.max(...mileages);

    const worst =
        Math.min(...mileages);

    const latest =
        vehicleRecords[
            vehicleRecords.length - 1
        ];

    doc.setFontSize(13);

    doc.text(
        "Performance Summary",
        15,
        y
    );

    y += 10;

    doc.setFontSize(10);

    doc.text(
        `Current Mileage : ${latest.mileage.toFixed(2)} KM/L`,
        15,
        y
    );

    y += 6;

    doc.text(
        `Average Mileage : ${avg.toFixed(2)} KM/L`,
        15,
        y
    );

    y += 6;

    doc.text(
        `Best Mileage : ${best.toFixed(2)} KM/L`,
        15,
        y
    );

    y += 6;

    doc.text(
        `Worst Mileage : ${worst.toFixed(2)} KM/L`,
        15,
        y
    );

    y += 15;

    doc.setFontSize(13);

    doc.text(
        "Record History",
        15,
        y
    );

    y += 10;

    vehicleRecords.forEach(
        record => {

            if (y > 270) {

                doc.addPage();

                y = 20;

            }

            doc.setFontSize(9);

            doc.text(

                `${new Date(
                    record.created
                ).toLocaleDateString()} | Distance:${record.distance} KM | Fuel:${record.fuelLitres}L | Mileage:${record.mileage.toFixed(2)} KM/L | Cost ₹${record.fuelCost}`,

                15,
                y

            );

            y += 6;

        }
    );

    doc.save(
        `${vehicle.name}_Mileage_Report.pdf`
    );

}

/* ===================================
   JSON EXPORT
=================================== */

function exportJSON() {

    const backup = {

        vehicles,

        records,

        activeVehicleId,

        exportedOn:
            new Date()
            .toISOString()

    };

    const blob =
        new Blob(

            [
                JSON.stringify(
                    backup,
                    null,
                    2
                )
            ],

            {
                type:
                    "application/json"
            }

        );

    const url =
        URL.createObjectURL(
            blob
        );

    const a =
        document.createElement(
            "a"
        );

    a.href = url;

    a.download =
        "FuelTrackerBackup.json";

    a.click();

    URL.revokeObjectURL(url);

}

/* ===================================
   JSON IMPORT
=================================== */

function importJSON(event) {

    const file =
        event.target.files[0];

    if (!file) return;

    const reader =
        new FileReader();

    reader.onload =
        function(e) {

            try {

                const data =
                    JSON.parse(
                        e.target.result
                    );

                vehicles =
                    data.vehicles || [];

                records =
                    data.records || [];

                activeVehicleId =
                    data.activeVehicleId || null;

                saveVehicles();

                saveRecords();

                saveActiveVehicle();

                populateVehicleDropdown();

                renderRecords();

                updateDashboard();

                alert(
                    "Backup restored successfully."
                );

            } catch(error) {

                alert(
                    "Invalid JSON file."
                );

            }

        };

    reader.readAsText(file);

}

/* ===================================
   DELETE ALL DATA
=================================== */

function deleteAllData() {

    const confirmDelete =
        confirm(
            "Delete ALL vehicles and records permanently?"
        );

    if (
        !confirmDelete
    ) return;

    localStorage.removeItem(
        STORAGE_KEYS.VEHICLES
    );

    localStorage.removeItem(
        STORAGE_KEYS.RECORDS
    );

    localStorage.removeItem(
        STORAGE_KEYS.ACTIVE_VEHICLE
    );

    vehicles = [];
    records = [];
    activeVehicleId = null;

    populateVehicleDropdown();

    renderRecords();

    updateDashboard();

    alert(
        "All data deleted."
    );

}

/* ===================================
   WINDOW CLOSE HANDLING
=================================== */

window.addEventListener(
    "beforeunload",
    () => {

        saveVehicles();

        saveRecords();

        saveActiveVehicle();

    }
);
