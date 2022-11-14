import express from "express";
import { MongoClient } from "mongodb";
import cors from "cors";
import dayjs from "dayjs";
import joi from "joi";
import dotenv from "dotenv";

const userSchema = joi.object({
    name: joi.string().required().min(1)
})

const messageSchema = joi.object({
    to: joi.string().required().min(1),
    text: joi.string().required().min(1),
    type: joi.string().required().valid('message', 'private_message')
})

const app = express();

//configs
app.use(cors());
app.use(express.json());
dotenv.config();

const calendario = dayjs().format('HH:MM:ss')
const mongoClient = new MongoClient(process.env.MONGO_URI);
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
    const participants = db.collection("participants")
    const pname = { name: body }
    const validation = userSchema.validate(req.body, { abortEarly: false })

    if (validation.error) {
        const error = validation.error.details.map(detail => detail.message)
        res.status(422).send(error);
        return
    }


    try {
        const check = await participants.findOne(pname);
        if (check) {
            res.sendStatus(409);
            return;
        } else {
            await participants.insertOne({
                "name": body, "lastStatus": Date.now()
            });
            res.sendStatus(201);
            db.collection("messages").insertOne({
                'from': body,
                'to': 'Todos',
                'text': 'entra na sala...',
                'type': 'status',
                'time': calendario
            })
        };
    } catch (err) {
        res.status(500).send(err);
    }
})

async function apagaInativos() {
    const participants = db.collection("participants");
    const date = Date.now()
    const filtro = { lastStatus: { $lt: date - 10000 } };
    try {
        const users = await participants.findOne(filtro);
        let user = users.name;
        db.collection("messages").insertOne({
            'from': user,
            'to': 'Todos',
            'text': 'sai da sala...',
            'type': 'status',
            'time': calendario
        });
        await participants.deleteOne(filtro);
    } catch (error) {
        return;
    }
}

setInterval(apagaInativos, 15000);

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
    const pname = { name: user }
    const participants = db.collection("participants")

    const validation = messageSchema.validate(req.body, { abortEarly: false })

    if (validation.error) {
        const error = validation.error.details.map(detail => detail.message)
        res.status(422).send(error);
        return
    }

    try {
        const check = await participants.findOne(pname);
        if (check) {
            await db.collection("messages")
                .insertOne({
                    'from': user,
                    'to': body.to,
                    'text': body.text,
                    'type': body.type,
                    'time': calendario
                });
            res.sendStatus(201)
        } else {
            res.sendStatus(422);
            return;
        }
    } catch (err) {
        res.status(500).send(err);
    };
});

app.post("/status", async (req, res) => {
    const user = req.headers.user;
    const participants = db.collection("participants")
    const filtro = { name: user };
    const newStatus = { $set: { lastStatus: Date.now() } }
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