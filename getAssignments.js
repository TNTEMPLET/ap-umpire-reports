import { assignr_url, client_id, client_secret } from "./config.js";
// Get Bearer Token
async function getToken(tokenUrl, clientId, clientSecret) {
    const headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    };
    const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
    });
    try {
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: headers,
            body: body
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error retrieving access token. Status Code ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        console.log(data)
        
        const accessToken = data.access_token;
        return(accessToken)
    
    } catch (error) {
        console.error(`Network error: ${error}`);
    }
}

// Get Game IDs
async function getGameIds(accessToken, apiUrl, siteId, startDate =  null, endDate = null) {
    const endpoint = `${apiUrl}/v2/sites/${siteId}/games`;
    const headers = {
        "Accept": "application/json",
        "Authorization": `Bearer ${accessToken}`
    };
    const params = new URLSearchParams({
        limit: 50,
        'search[start_date]': startDate,
        'search[end_date]': endDate
    });
    let allGames = [];
    let page = 1;
    // While loop to get around pagination
    while(true) {
        params.set('page', page);
        try {
            const response = await fetch(`${endpoint}?${params.toString()}`, {
                method: `GET`,
                headers: headers
            });
            console.log(`Fetching: ${endpoint}?${params.toString()}`);
            console.log(`Response Status: ${response.status}`);
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Error retrieving games. Status Code: ${response.status} -  ${errorText}`);
                break;
            }
            const data = await response.json();
            console.log('API Response: ', data);
            const games = data._embedded.games;
            if (Array.isArray(games)) {
                allGames = allGames.concat(games);
            } else {
                console.error('No games found in response data');
                break;
            }
    
            if (page < data.page.pages) {
                page++;
            } else {
                break;
            }
        } catch (error) {
            console.error(`Network error: ${error}`);
            break;
        }
    }
    console.log(`Total games retrieved: ${allGames.length}`);
    return allGames;
}
async function populateReport() {
    // Configuration
    const tokenUrl = "http://localhost:3100/proxy/oauth/token";
    const apiUrl = "http://localhost:3100/api";
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
        '7U': 40,
        '8U': 40,
        '8UMAJ': 40,
        '9U': 60,
        '10U': 60,
        '12U': 60,
        '14U': 80,
        '16U': 60
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

            const dateSection = document.createElement("div");
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
                if (ageGroup === '16U') {
                    // Always 2 umpires for 16U
                    firstUmpirePay = payRates[ageGroup];  // Rate for the first umpire
                    secondUmpirePay = payRates[ageGroup];  // Rate for the second umpire
                } else if (ageGroup === '8U' || ageGroup === '7U') {
                    // Always 2 umpires for 8U and 7U
                    firstUmpirePay = payRates[ageGroup];  // Adjust to the specific rate for 7U/8U
                    secondUmpirePay = payRates[ageGroup];  // Adjust to the specific rate for 7U/8U
                } else if (ageGroup === '9U') {
                    if (assignmentCount === 2) {
                        // Specific pay logic for 2 umpires in 9U
                        firstUmpirePay = payRates[ageGroup];  // Adjust if different for the first umpire
                        secondUmpirePay = 40;  // Adjust if different for the second umpire
                    } else {
                        // Only one umpire assigned for 9U
                        firstUmpirePay = payRates[ageGroup];  // Pay for one umpire
                    }
                } else {
                    // Default case for other age groups (1 umpire)
                    if (assignmentCount === 1) {
                        firstUmpirePay = payRates[ageGroup] || 0; // Standard pay
                    }
                }
                

                console.log(firstUmpirePay, secondUmpirePay)

                let gamePay = firstUmpirePay + secondUmpirePay; // Total pay for the game
                let fieldPosition = assignmentCount > 1 ? assignments[0]?.position || '' : '';
                let umpireColumns = [];
                
                assignments.forEach((assignment, index) => {
                    if (index < 2 ) { // Limitting to two umpires
                        umpireColumns.push(`
                            <td>${assignment.position}</td>
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
                    <td>${game.localized_date}</td>
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
async function generateAndPrintReport(){
    await populateReport();
    window.print();
}
document.getElementById("generate-report").addEventListener('click', populateReport);
document.getElementById("print-report").addEventListener('click', generateAndPrintReport);