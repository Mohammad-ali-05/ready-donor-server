const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 3000;

/* Firebase admin SDk */
const admin = require("firebase-admin");
const decoded = Buffer.from(process.env.FIREBASE_ADMIN_KEY, "base64").toString(
    "utf-8",
);
const serviceAccount = JSON.parse(decoded);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

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

// Verify Firebase token
const verifyFirebaseToken = async (req, res, next) => {
    /* If header is not available send error status and message */
    if (!req.headers.authorization) {
        return res.status(401).send({ message: "Unauthorized access" });
    }
    /* Getting the token */
    const token = req.headers.authorization.split(" ")[1];
    /* If token is not available send error status and message */
    if (!token) {
        return res.status(401).send({ message: "Unauthorized access" });
    }

    try {
        const userInfo = await admin.auth().verifyIdToken(token);
        req.tokenEmail = userInfo.email;
        req.tokenUid = userInfo.uid;
        next();
    } catch {
        return res.status(401).send({ message: "Unauthorized access" });
    }
};

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

        /* User API' */
        // Post a user
        app.post("/api/user", verifyFirebaseToken, async (req, res) => {
            try {
                // Destructure user data
                const {
                    uid,
                    email,
                    name,
                    image,
                    bloodGroup,
                    divisionName,
                    divisionId,
                    districtName,
                    districtId,
                    upazilaName,
                    upazilaId,
                    status,
                    role,
                    createdAt,
                    updatedAt,
                } = req.body;

                // Token data
                const tokenEmail = req.tokenEmail;
                const tokenUid = req.tokenUid;

                // Checking if token user and request user matches
                if (email !== tokenEmail || uid !== tokenUid) {
                    return res
                        .status(403)
                        .send({ message: "Forbidden access" });
                }

                // Checking if all value exist
                if (
                    !uid ||
                    !email ||
                    !name ||
                    !image ||
                    !bloodGroup ||
                    !divisionName ||
                    !divisionId ||
                    !districtName ||
                    !districtId ||
                    !upazilaName ||
                    !upazilaId ||
                    !status ||
                    !role ||
                    !createdAt ||
                    !updatedAt
                ) {
                    return res.status(400).send({ message: "Bad Request" });
                }

                // checking status and role send by the client
                if (role !== "donor" || status !== "active") {
                    return res.status(400).send({ message: "Bad Request" });
                }

                // Checking if user exist with this email
                const doesUserExists = await usersCollection.findOne({
                    email: email,
                });

                // Set user schema
                const userData = {
                    uid,
                    email,
                    name,
                    image,
                    bloodGroup,
                    divisionName,
                    divisionId,
                    districtName,
                    districtId,
                    upazilaName,
                    upazilaId,
                    status,
                    role,
                    createdAt,
                    updatedAt,
                };

                if (!doesUserExists) {
                    // If user does not exist save it database
                    const result = await usersCollection.insertOne(userData);

                    res.status(201).send(result);
                } else {
                    res.status(409).send({
                        message: "Account already exist",
                    });
                }
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
