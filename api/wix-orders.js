// Vercel Serverless Function - Wix API Proxy
// This function acts as a backend proxy to bypass CORS restrictions

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Wix API credentials
    const WIX_API_KEY = "IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcImQwYzY3NjM2LTBkOTctNDFlNy1hYWQ4LThmZTIyNWRjMjFiN1wiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcImVkYTRiNzRkLTI1YmYtNDc5My05ZmQ3LWJiODQwYzA5MTQyMlwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCI3OTA5ZmY5ZC1kN2U5LTQ4YzktOTcyZi02ZDM1M2VlNmU0NDJcIn19IiwiaWF0IjoxNzY1MjQzNjMxfQ.QmPtRgP-sggDlRYdZVcESBg7wmy4UCi0a8dexIxaqLfIBjySYb4n38tCzCeOjQi_kfyMT-T1ya8eOfh_yXuHGtgDlO_jRlZNOTnMHO4DDldQD97i_o2IjOjkoutB4cVK92XKIOg_WRUoVWTzeubhtB63pAaDubOwm9bPkDaO4LLAY6O7kg9PXScx3jIMndIrar1oDuk4O5gMdQCiCc7c4UsHFk96o4EC2KKzcatIFUpbKAgqM8yH0I7nTKXdXQb87WHVYzIhoMFyJ0SONkfJAVMsl_oLfNcSIuL9486hfh4jq-y5V3o0CcS-SuTb76PemhjozRKDAQJPXaSSRfLNEw";
    const WIX_SITE_ID = "a290c1b4-e593-4126-ae4e-675bd07c1a42";

    try {
        // Call Wix API
        const response = await fetch('https://www.wixapis.com/ecom/v1/orders/search', {
            method: 'POST',
            headers: {
                'Authorization': WIX_API_KEY,
                'wix-site-id': WIX_SITE_ID,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                search: {
                    cursorPaging: {
                        limit: 100
                    }
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Wix API error: ${response.status}`);
        }

        const data = await response.json();

        // Return orders to frontend
        return res.status(200).json({
            success: true,
            orders: data.orders || []
        });

    } catch (error) {
        console.error('Error fetching Wix orders:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
