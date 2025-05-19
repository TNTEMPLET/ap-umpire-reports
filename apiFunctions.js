
export async function getToken(tokenUrl, clientId, clientSecret) {
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
        document.getElementById("games-container").innerText = "Loading data...";
        
        
        const accessToken = data.access_token;
        return(accessToken)
    
    } catch (error) {
        console.error(`Network error: ${error}`);
    }
}

// Get Game IDs
export async function getGameIds(accessToken, apiUrl, siteId, startDate =  null, endDate = null) {
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