const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 3000;

//Middleware
app.use(express.json());
app.use(cors());
app.use((req, res, next) => {
    console.log(
        `⚡ ${req.method} - ${req.path} from ${
            req.host
        } at ⌛ ${new Date().toLocaleString()}`,
    );
    next();
});

// mongodb
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        console.log("✅ Connected to MongoDB");
        //DB
        const db = client.db("readyDonorDB");
        //Collections
        const districtCollection = db.collection("district");
        const upazilaCollection = db.collection("upazila");
        const usersCollection = db.collection("user");

        app.get("/", (req, res) => {
            res.send("Hello from ready donor server");
        });

        // Location API's
        // District API
        app.get("/api/district", async (req, res) => {
            try {
                const { divisionId } = req.query;

                if (!divisionId) {
                    res.status(400).send({ error: "Bad Request" });
                }

                const result = await districtCollection
                    .find({ division_id: divisionId })
                    .sort({ id: 1 })
                    .toArray();

                res.status(200).send(result);
            } catch (error) {
                console.log(error);
                res.status(500).json({ error: "Internal Server Error" });
            }
        });

        // Upazila
        app.get("/api/upazila", async (req, res) => {
            try {
                const { districtId } = req.query;

                if (!districtId) {
                    res.status(400).send({ error: "Bad Request" });
                }

                const result = await upazilaCollection
                    .find({ district_id: districtId })
                    .sort({ id: 1 })
                    .toArray();

                res.status(200).send(result);
            } catch (error) {
                console.log(error);
                res.status(500).json({ error: "Internal Server Error" });
            }
        });
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

// Listening to incoming request
app.listen(port, () => {
    console.log(`Listening of port ${port}`);
});
