import express, { response } from "express";
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


mongoClient
    .connect()
    .then(() => {
        db = mongoClient.db("batePapoUol");
    })
    .catch((err) => console.log(err));

app.get("/participants", (req, res) => {
    db.collection("participants")
        .find()
        .toArray()
        .then((user) => {
            res.send(user);
        }).catch(err => {
            console.log(err)
            res.sendStatus(500);
        });
});

app.post("/participants", (req, res) => {
    const body = req.body.name
    const find = db.collection("participants").findOne({
        name: body
    })

    const validation = userSchema.validate(req.body, { abortEarly: false })

    if (validation.error) {
        const error = validation.error.details.map(detail => detail.message)
        res.status(422).send(error);
        return
    }

    db.collection("participants")
        .insertOne({
            "name": body, "lastStatus": Date.now()
        })
        .then(() => {
            res.sendStatus(201);
            db.collection("messages").insertOne({
                'from': body,
                'to': 'Todos',
                'text': 'entra na sala...',
                'type': 'status',
                'time': calendario
            })
        })
        .catch(err => {
            res.status(500).send(err);
        });
});

app.get("/messages",
    (req, res) => {
        const limit = parseInt(req.query.limit);
        const user = req.headers.user;
        const filter = {$or: [{"to": user}, {"to": "Todos"}, {"type": "message"}]}


        if (!req.query.limit) {
            db.collection("messages")
                .find()
                .toArray()
                .then(msg => {
                    res.send(msg);
                }).catch(err => {
                    console.log(err)
                    res.sendStatus(500);
                })
        } else {
            db.collection("messages")
                .find(filter)
                .toArray()
                .then(msg => {
                    res.send(msg.slice(msg.length-limit));
                }).catch(err => {
                    console.log(err)
                    res.sendStatus(500);
                })
        };
    });

app.post("/messages", (req, res) => {
    const body = req.body;
    const user = req.headers.user

    const validation = messageSchema.validate(req.body, { abortEarly: false })

    if (validation.error) {
        const error = validation.error.details.map(detail => detail.message)
        res.status(422).send(error);
        return
    }

    db.collection("messages")
        .insertOne({
            'from': user,
            'to': body.to,
            'text': body.text,
            'type': body.type,
            'time': calendario
        })
        .then(() => {
            res.sendStatus(201)
        })
        .catch(err => {
            res.status(500).send(err);
        });
});

app.listen(5000);