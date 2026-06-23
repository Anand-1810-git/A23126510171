import express from 'express';
import { loggingMiddleware } from '../logging-middleware/logging.mjs';

const app = express();
const PORT = 3000;

app.use(loggingMiddleware);
app.use(express.json());

const BASE_URL = "http://4.224.186.213/evaluation-service";
const CREDENTIALS = {
    email: "peddipagaanandkumar.23.cse@anits.edu.in",
    name: "anand kumar peddipaga",
    rollNo: "a23126510171",
    accessCode: "MTqxar",
    clientID: "34760ba7-f3a4-4076-9cea-5928cb3ae05e",
    clientSecret: "zfCFvHpqqQmxcBMd"
};

async function getAuthToken() {
    try {
        const response = await fetch(`${BASE_URL}/auth`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(CREDENTIALS)
        });
        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error("Auth payload failed:", error.message);
        return null;
    }
}

function optimizeTasksForDepot(tasks, totalCapacity) {
    const n = tasks.length;
    const dp = Array(n + 1).fill(null).map(() => Array(totalCapacity + 1).fill(0));
    
    for (let i = 1; i <= n; i++) {
        const currentTask = tasks[i - 1];
        const weight = currentTask.Duration;
        const value = currentTask.Impact;
        
        for (let w = 0; w <= totalCapacity; w++) {
            if (weight <= w) {
                dp[i][w] = Math.max(value + dp[i - 1][w - weight], dp[i - 1][w]);
            } else {
                dp[i][w] = dp[i - 1][w];
            }
        }
    }
    
    const chosenTasks = [];
    let capacityRemaining = totalCapacity;
    for (let i = n; i > 0; i--) {
        if (dp[i][capacityRemaining] !== dp[i - 1][capacityRemaining]) {
            chosenTasks.push(tasks[i - 1]);
            capacityRemaining -= tasks[i - 1].Duration;
        }
    }
    
    return { chosenTasks, totalImpact: dp[n][totalCapacity] };
}
app.get('/schedule', async (req, res) => {
    const startTime = Date.now();
    try {
        const token = await getAuthToken();
        if (!token) return res.status(401).json({ error: "Access token acquisition failed" });

        const headers = { 'Authorization': `Bearer ${token}` };

        const [depotsRes, vehiclesRes] = await Promise.all([
            fetch(`${BASE_URL}/depots`, { headers }).then(r => r.json()),
            fetch(`${BASE_URL}/vehicles`, { headers }).then(r => r.json())
        ]);
        const depots = depotsRes.depots || [];
        const vehicles = vehiclesRes.vehicles || [];
        const optimalSchedules = depots.map(depot => {
            const result = optimizeTasksForDepot(vehicles, depot.MechanicHours);
            return {
                DepotID: depot.ID,
                AvailableMechanicHours: depot.MechanicHours,
                TotalAchievedImpact: result.totalImpact,
                ScheduledTasks: result.chosenTasks.map(t => t.TaskID)
            };
        });

        res.json({
            responseTime: `${Date.now() - startTime}ms`,
            schedule: optimalSchedules
        });

    } catch (error) {
        res.status(502).json({ error: "Computational data pipeline breakdown", details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server executing successfully on http://localhost:${PORT}`);
});