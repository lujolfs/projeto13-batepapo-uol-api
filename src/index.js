import express from "express";
import { MongoClient } from "mongodb";
import cors from "cors";
import dayjs from "dayjs";
import joi from "joi";

const userSchema = joi.object({
    name: joi.string().required().min(1)
})

const messageSchema = joi.object({
    to: joi.string().required().min(1),
    text: joi.string().required().min(1),
    type: joi.string().required().valid('message', 'private_message')
})

const app = express();

app.use(cors());
app.use(express.json());

const calendario = dayjs().format('HH:MM:ss')
const mongoClient = new MongoClient("mongodb://localhost:27017");
let db;

try {
    await mongoClient.connect();
    db = mongoClient.db("batePapoUol");
} catch (err) {
    console.log(err);
}

app.get("/participants", async (req, res) => {
    try {
        const participants = await db
            .collection("participants")
            .find()
            .toArray();
        res.send(participants);
    } catch (err) {
        console.log(err)
        res.sendStatus(500);
    };
});

app.post("/participants", async (req, res) => {
    const body = req.body.name

    const validation = userSchema.validate(req.body, { abortEarly: false })

    if (validation.error) {
        const error = validation.error.details.map(detail => detail.message)
        res.status(422).send(error);
        return
    }

    try {
        await db.collection("participants").insertOne({
            "name": body, "lastStatus": Date.now()
        });
        res.sendStatus(201);
        db.collection("messages").insertOne({
            'from': body,
            'to': 'Todos',
            'text': 'entra na sala...',
            'type': 'status',
            'time': calendario
        });
    } catch (err) {
        res.status(500).send(err);
    }
})

app.get("/messages", async (req, res) => {
    const limit = parseInt(req.query.limit);
    const user = req.headers.user;
    const filter = { $or: [{ "to": user }, { "to": "Todos" }, { "type": "message" }, { "from": user }] }

    if (!req.query.limit) {
        try {
            const msg = await db
                .collection("messages")
                .find()
                .toArray();
            res.send(msg);
        } catch (err) {
            console.log(err)
            res.sendStatus(500);
        }
    } else {
        try {
            const msg = await db
                .collection("messages")
                .find(filter)
                .toArray();
            res.send(msg.slice(msg.length - limit));
        } catch (err) {
            console.log(err)
            res.sendStatus(500);
        }
    };
});

app.post("/messages", async (req, res) => {
    const body = req.body;
    const user = req.headers.user

    const validation = messageSchema.validate(req.body, { abortEarly: false })

    if (validation.error) {
        const error = validation.error.details.map(detail => detail.message)
        res.status(422).send(error);
        return
    }

    try {
        await db.collection("messages")
            .insertOne({
                'from': user,
                'to': body.to,
                'text': body.text,
                'type': body.type,
                'time': calendario
            });
        res.sendStatus(201)
    } catch (err) {
        res.status(500).send(err);
    };
});

app.post("/status", async (req, res) => {
    const user = req.headers.user;
    const participants = db.collection("participants")
    const filtro = {name: user};
    const newStatus = {$set: {lastStatus: Date.now()}}
    try {
        const resultado = await participants.findOne(filtro);
        if (!resultado) {
            res.sendStatus(404);
            return;
        }
        await participants.updateOne(filtro, newStatus);
        res.sendStatus(200);
        
    } catch (error) {
        res.sendStatus(404)
    }

})

app.listen(5000);