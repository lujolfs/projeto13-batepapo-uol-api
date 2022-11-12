import express from "express";
import { MongoClient } from "mongodb";

const app = express();
app.use(express.json());

const mongoClient = new MongoClient("mongodb://localhost:27017");
let db;

mongoClient
.connect()
.then(() => {
    db = mongoClient.db("test");
})
.catch((err) => console.log(err));

app.get("/testando", (req, res) => {
    db.collection("users")
    .find()
    .toArray()
    .then((email) => {
        console.log(email);
        res.send("ok");
    }).catch(err => {
        console.log(err)
        res.sendStatus(500);
    });
});

app.listen(5000);