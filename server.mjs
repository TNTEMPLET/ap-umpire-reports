import express from 'express';
import request from 'request';
import cors from 'cors';

const app = express();
const PORT = 3000;

app.use(cors()); // Enable CORS for all requests

app.use(`/proxy`, (req, res) => {
    const url = 'https://app.assignr.com' + req.url; // Forward requests to the actual API
    req.pipe(request(url)).pipe(res);
});

app.use('/api', (req, res) => {
    const url = "https://api.assignr.com/api" + req.url; // Forward request to the actual API call
    req.pipe(request(url)).pipe(res);
})

app.listen(PORT, () => {
    console.log(`Proxy server running at http://localhost:${PORT}`);
});

