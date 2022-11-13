import express, { response } from "express";
import { MongoClient } from "mongodb";
import cors from "cors";
import dayjs from "dayjs";
import joi from "joi";


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
        console.log(user);
        res.send("ok");
    }).catch(err => {
        console.log(err)
        res.sendStatus(500);
    });
});

app.post("/participants", (req, res) => {
    const body = req.body.name
    db.collection("participants")
    .insertOne({
        "name": body, "lastStatus": Date.now()
    })
    .then(() => {
        res.status(201).send("Usuário criado com sucesso.")
        db.collection("messages").insertOne({
            'from': body, 
            'to': 'Todos',
            'text': 'entra na sala...',
            'type': 'status',
            'time': calendario})
        })
    .catch(err => {
        res.status(500).send(err);
    });
});

app.get("/messages", (req, res) => {
    db.collection("messages")
    .find()
    .toArray()
    .then((msg) => {
        res.send(msg);
    }).catch(err => {
        console.log(err)
        res.sendStatus(500);
    });
});

app.post("/messages", (req, res) => {
    const body = req.body.name
    db.collection("participants")
    .insertOne({
        "name": body, "lastStatus": Date.now()
    })
    .then(() => {
        res.status(201).send("Usuário criado com sucesso.")
    })
    .catch(err => {
        res.status(500).send(err);
    });
});

app.listen(5000);