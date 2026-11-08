import axios from 'axios';

async function test() {
    try {
        const res = await axios.get('http://localhost:3000/api/scan');
        console.log("Success:", res.data.success);
        console.log("Total Scanned:", res.data.totalScanned);
        console.log("Best Signal:", res.data.bestSignal);
        console.log("Errors/Logs:");
        console.log(res.data.debugLogs.slice(-10));
    } catch(e) {
        console.error(e);
    }
}
test();
