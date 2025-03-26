import { assignr_url, client_id, client_secret, devBaseUrl, prodBaseUrl } from "./config.js";
import { getToken, getGameIds } from "./apiFunctions.js";

async function populateReport() {
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
     // Add Pay Scale
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
    // Group games by venue
    const groupedGames = games.reduce((acc, game) => {
        const park = game._embedded.venue.name;
        if (!acc[park]) {
            acc[park] = [];
        }
        acc[park].push(game);
        return acc;
    }, {}); 
    //Create table rows with park headers
    for (const park in groupedGames) {
       
        // Add Park Header
        const parkDiv = document.createElement("div");
        parkDiv.classList.add("park-section");
        const parkHeader = document.createElement("h1");
        const dateRangeHeader = document.createElement("h2");
        dateRangeHeader.id = "date-range";
        dateRangeHeader.textContent = `From: ${startDate} To: ${endDate}`;
        parkDiv.appendChild(parkHeader);
        parkDiv.appendChild(dateRangeHeader);
        
        let totalWeeklyPay = 0;
        // Group Games by date for this park
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

            const dateHeaderRow = document.createElement("tr")
            dateHeaderRow.innerHTML =`
                <td colspan=16 class="date-header">${dayName}</td>
            `;
            dateSection.appendChild(dateHeaderRow);

            const tableHeaderRow = document.createElement("tr")
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
                const firstName = assignments._embedded?.official?.first_name || '';
                const ageGroup = game.age_group;
                let firstUmpirePay = 0;
                let secondUmpirePay = 0;

                // Set pay based on the number of umpires assigned
                if (ageGroup === '17U') {
                    // Always 2 umpires for 16U
                    firstUmpirePay = payRates[ageGroup];  // Rate for the first umpire
                    secondUmpirePay = payRates[ageGroup];  // Rate for the second umpire
                } else if (ageGroup === '8U' || ageGroup === '7U' || ageGroup === '8UMAJ') {
                    // Always 2 umpires for 8U and 7U
                    firstUmpirePay = payRates[ageGroup];  // Adjust to the specific rate for 7U/8U
                    secondUmpirePay = payRates[ageGroup];  // Adjust to the specific rate for 7U/8U
                } else if (ageGroup === '9U') {
                    if (assignmentCount === 2) {
                        // Specific pay logic for 2 umpires in 9U
                        firstUmpirePay = payRates[ageGroup];  // Adjust if different for the first umpire
                        secondUmpirePay = payRates[ageGroup];  // Adjust if different for the second umpire
                    } else {
                        // Only one umpire assigned for 9U
                        firstUmpirePay = payRates[ageGroup];  // Pay for one umpire
                    }
                } else {
                    // Default case for other age groups (1 umpire)
                    if (assignmentCount === 1) {
                        firstUmpirePay = 60 || 0; // Standard pay
                    } else {
                        // Special case for 2 umpires
                        firstUmpirePay = payRates[ageGroup] || 0;  // Adjust if different for the first umpire
                        secondUmpirePay = payRates[ageGroup] || 0;  // Adjust if different for the second umpire
                    }
                }
        

                let gamePay = firstUmpirePay + secondUmpirePay; // Total pay for the game
                let fieldPosition = assignmentCount > 1 ? assignments[0]?.position || '' : '';
                let umpireColumns = [];
                
                assignments.forEach((assignment, index) => {
                    if (index < 2 ) { // Limitting to two umpires
                        umpireColumns.push(`
                            <td>${assignment._embedded?.official?.first_name || ''} ${assignment._embedded?.official?.last_name || ''}</td>
                            <td>$${firstUmpirePay}</td>
                        `);
                    }
                });
                // Update daily and weekly totals
                totalPayforDate += gamePay 
                totalWeeklyPay += gamePay
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
         //Output weekly totals
        const totalWeekRow = document.createElement("tr");
        totalWeekRow.innerHTML = `
            <td colspan="16" style="font-weight: bold;">${park}</td></br>
            <td colspan="16" style="font-weight: bold; font-size: .75em;">Total Pay  = $${totalWeeklyPay}</td>
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