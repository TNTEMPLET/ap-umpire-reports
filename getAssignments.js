import { assignr_url, client_id, client_secret, devBaseUrl, prodBaseUrl } from "./config.js";
import { getToken, getGameIds } from "./apiFunctions.js";

async function populateReport() {
    // Configuration (unchanged)
    const tokenUrl = `${prodBaseUrl}/proxy/oauth/token`;
    const apiUrl = `${prodBaseUrl}/api`;
    const clientId = client_id;
    const clientSecret = client_secret;
    const accessToken = await getToken(tokenUrl, clientId, clientSecret);
    const siteId = `18601`;
    const startDate = document.getElementById("start-date").value;
    const endDate = document.getElementById("end-date").value;
    const games = await getGameIds(accessToken, apiUrl, siteId, startDate, endDate);
    const gamesContainer = document.getElementById("games-container");
    gamesContainer.innerHTML = '';

    // Pay Scale (unchanged)
    const payRates = {
        '6UCP': 40,
        '7U': 40,
        '8U': 40,
        '8UMAJ': 40,
        '9U': 60,
        '10U': 60,
        '10UMAJ': 50,
        '12U': 60,
        '12UMAJ': 50,
        '15U': 80,
        '17U': 60
    };

    // Group games by venue (unchanged)
    const groupedGames = games.reduce((acc, game) => {
        const park = game._embedded.venue.name;
        if (!acc[park]) {
            acc[park] = [];
        }
        acc[park].push(game);
        return acc;
    }, {});

    // Create table rows with park headers
    for (const park in groupedGames) {
        const parkDiv = document.createElement("div");
        parkDiv.classList.add("park-section");
        const parkHeader = document.createElement("h1");
        const dateRangeHeader = document.createElement("h2");
        dateRangeHeader.id = "date-range";
        dateRangeHeader.textContent = `From: ${startDate} To: ${endDate}`;
        parkDiv.appendChild(parkHeader);
        parkDiv.appendChild(dateRangeHeader);
        
        let totalWeeklyPay = 0;
        
        // Group Games by date for this park (unchanged)
        const gamesByDate = groupedGames[park].reduce((acc, game) => {
            const gameDate = new Date(game.start_time).toLocaleDateString();
            if (!acc[gameDate]) {
                acc[gameDate] = [];
            }
            acc[gameDate].push(game);
            return acc;
        }, {});

        // Process each date
        for (const date in gamesByDate) {
            const games = gamesByDate[date];
            let totalPayforDate = 0;

            const dateObj = new Date(date);
            const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const dayName = days[dateObj.getDay()];

            const dateSection = document.createElement("table");
            dateSection.classList.add("date-section");

            const dateHeaderRow = document.createElement("tr");
            dateHeaderRow.innerHTML = `
                <td colspan="16" class="date-header">${dayName}</td>
            `;
            dateSection.appendChild(dateHeaderRow);

            const tableHeaderRow = document.createElement("tr");
            tableHeaderRow.innerHTML = `
                <th>Date</th>
                <th>Time</th>
                <th>Home Team</th>
                <th>Away Team</th>
                <th>Park</th>
                <th>Field</th>
                <th>Age Group</th>
                <th colspan="8">Assignments</th>
            `;
            dateSection.appendChild(tableHeaderRow);

            // Process each game for this date
            games.forEach(game => {
                const assignments = game._embedded.assignments || [];
                const assignmentCount = assignments.length;
                const ageGroup = game.age_group;
                let gamePay = 0; // Initialize game pay to 0
                let umpireColumns = [];

                // Only calculate pay if there are assignments
                if (assignmentCount > 0) {
                    let firstUmpirePay = 0;
                    let secondUmpirePay = 0;
                    let validAssignments = assignments.filter(assignment => 
                        assignment._embedded?.official?.first_name || assignment._embedded?.official?.last_name
                    );

                    if (validAssignments.length > 0) {
                        if (ageGroup === '17U' && validAssignments.length >= 2) {
                            firstUmpirePay = payRates[ageGroup];
                            secondUmpirePay = payRates[ageGroup];
                        } else if (['8U', '7U', '8UMAJ'].includes(ageGroup) && validAssignments.length >= 2) {
                            firstUmpirePay = payRates[ageGroup];
                            secondUmpirePay = payRates[ageGroup];
                        } else if (ageGroup === '9U') {
                            if (validAssignments.length === 2) {
                                firstUmpirePay = payRates[ageGroup];
                                secondUmpirePay = payRates[ageGroup];
                            } else if (validAssignments.length === 1) {
                                firstUmpirePay = payRates[ageGroup];
                            }
                        } else {
                            if (validAssignments.length === 1) {
                                firstUmpirePay = payRates[ageGroup] || 60;
                            } else if (validAssignments.length >= 2) {
                                firstUmpirePay = payRates[ageGroup] || 60;
                                secondUmpirePay = payRates[ageGroup] || 60;
                            }
                        }

                        gamePay = firstUmpirePay + secondUmpirePay;
                        totalPayforDate += gamePay;
                        totalWeeklyPay += gamePay;

                        // Generate umpire columns only for assigned umpires
                        validAssignments.slice(0, 2).forEach((assignment, index) => {
                            const pay = index === 0 ? firstUmpirePay : secondUmpirePay;
                            if (pay > 0) {  // Only add column if there's actual pay
                                umpireColumns.push(`
                                    <td>${assignment._embedded?.official?.first_name || ''} ${assignment._embedded?.official?.last_name || ''}</td>
                                    <td>$${pay}</td>
                                `);
                            }
                        });
                    }
                }

                // Add Game rows for the park
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${new Date(game.localized_date).toLocaleDateString("en-us")}</td>
                    <td>${game.localized_time}</td>
                    <td>${game.home_team}</td>
                    <td>${game.away_team}</td>
                    <td>${game._embedded.venue.name}</td>
                    <td>${game.subvenue}</td>
                    <td>${game.age_group}</td>
                    ${umpireColumns.join('')}
                `;
                dateSection.appendChild(row);
            });

            const totalRow = document.createElement("tr");
            totalRow.innerHTML = `<td colspan="16" style="font-weight: bold;">Total Pay for ${date} = $${totalPayforDate}</td>`;
            dateSection.appendChild(totalRow);
            parkDiv.appendChild(dateSection);
        }

        // Output weekly totals
        const totalWeekRow = document.createElement("tr");
        totalWeekRow.innerHTML = `
            <td colspan="16" style="font-weight: bold;">${park}</td><br>
            <td colspan="16" style="font-weight: bold; font-size: .75em;">Total Pay = $${totalWeeklyPay}</td>
        `;
        parkHeader.innerHTML = totalWeekRow.innerHTML;
        gamesContainer.appendChild(parkDiv);
    }
}
async function populateUmpireReport() {
    // Configuration
    const tokenUrl = `${prodBaseUrl}/proxy/oauth/token`; // Updated
    const apiUrl = `${prodBaseUrl}/api`; // Updated
    const clientId = client_id;
    const clientSecret = client_secret;
    const accessToken = await getToken(tokenUrl, clientId, clientSecret);
    const siteId = `18601`;
    const startDate = document.getElementById("start-date").value;
    const endDate = document.getElementById("end-date").value;
    const games = await getGameIds(accessToken, apiUrl, siteId, startDate, endDate);
    const gamesContainer = document.getElementById("games-container");
    gamesContainer.innerHTML = '';

    // Pay Scale
    const payRates = {
        '6UCP': 40, '7U': 40, '8U': 40, '8UMAJ': 40,
        '9U': 60, '10U': 60, '10UMAJ': 50,
        '12U': 60, '12UMAJ': 50,
        '15U': 80, '17U': 60
    };

    // Group payments by park and then date
    const paymentsByParkAndDate = games.reduce((acc, game) => {
        const parkName = game._embedded?.venue?.name || 'Unknown Park';
        const gameDate = new Date(game.start_time).toLocaleDateString();
        const assignments = game._embedded?.assignments || [];
        const ageGroup = game.age_group || 'Unknown';

        // Calculate game pay
        let gamePay = 0;
        if (ageGroup === '17U' || ageGroup === '8U' || ageGroup === '7U' || ageGroup === '8UMAJ') {
            gamePay = payRates[ageGroup] || 0;
        } else if (ageGroup === '9U') {
            gamePay = payRates[ageGroup] || 0;
        } else {
            gamePay = assignments.length === 1 ? 60 : (payRates[ageGroup] || 0);
        }

        // Process each assignment
        assignments.forEach(assignment => {
            const umpireId = assignment._embedded?.official?.id || 'unknown';
            const umpireName = `${assignment._embedded?.official?.first_name || ''} ${assignment._embedded?.official?.last_name || ''}`.trim() || 'Unknown Umpire';
            
            if (!acc[parkName]) {
                acc[parkName] = {};
            }
            if (!acc[parkName][gameDate]) {
                acc[parkName][gameDate] = {};
            }
            if (!acc[parkName][gameDate][umpireId]) {
                acc[parkName][gameDate][umpireId] = { 
                    name: umpireName, 
                    totalPay: 0 
                };
            }
            acc[parkName][gameDate][umpireId].totalPay += gamePay;
        });

        return acc;
    }, {});

    // Create report grouped by park and date
    const reportDiv = document.createElement("div");
    reportDiv.classList.add("report-section");

    const dateRangeHeader = document.createElement("h2");
    dateRangeHeader.textContent = `From: ${startDate} To: ${endDate}`;
    reportDiv.appendChild(dateRangeHeader);

    // Process each park
    for (const parkName in paymentsByParkAndDate) {
        const parkSection = document.createElement("div");
        parkSection.classList.add("park-section");

        // Calculate park total
        const dates = paymentsByParkAndDate[parkName];
        const parkTotal = Object.values(dates).reduce((parkSum, dateUmpires) => {
            return parkSum + Object.values(dateUmpires).reduce((dateSum, umpire) => dateSum + umpire.totalPay, 0);
        }, 0);

        const parkHeader = document.createElement("h3");
        parkHeader.textContent = `${parkName} - $${parkTotal.toFixed(2)}`;
        parkSection.appendChild(parkHeader);

        // Process each date within the park
        for (const date in dates) {
            const dateObj = new Date(date);
            const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const dayName = days[dateObj.getDay()];

            // Calculate daily total
            const umpires = dates[date];
            const dailyTotal = Object.values(umpires).reduce((sum, umpire) => sum + umpire.totalPay, 0);

            const dateSection = document.createElement("table");
            dateSection.classList.add("date-section");

            // Date header with total
            const dateHeaderRow = document.createElement("tr");
            dateHeaderRow.innerHTML = `
                <td colspan="2" class="date-header">${dayName} - ${date} - $${dailyTotal.toFixed(2)}</td>
            `;
            dateSection.appendChild(dateHeaderRow);

            // Table headers
            const tableHeaderRow = document.createElement("tr");
            tableHeaderRow.innerHTML = `
                <th>Umpire Name</th>
                <th>Pay</th>
            `;
            dateSection.appendChild(tableHeaderRow);

            // Add umpire rows
            for (const umpireId in umpires) {
                const umpireData = umpires[umpireId];
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${umpireData.name}</td>
                    <td>$${umpireData.totalPay.toFixed(2)}</td>
                `;
                dateSection.appendChild(row);
            }

            parkSection.appendChild(dateSection);
        }

        reportDiv.appendChild(parkSection);
    }

    gamesContainer.appendChild(reportDiv);
}

// Add input box handing for date range
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const dateRangeElement = document.getElementById('date-range');
function updateDateRange() {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    dateRangeElement.textContent = `From: ${startDate} To: ${endDate}`
}
startDateInput.addEventListener('input', updateDateRange);
endDateInput.addEventListener('input', updateDateRange)
async function printReport(){
    window.print();
}
document.getElementById("generate-main-report").addEventListener('click', populateReport);
document.getElementById("generate-umpire-report").addEventListener('click', populateUmpireReport);
document.getElementById("print-report").addEventListener('click', printReport);