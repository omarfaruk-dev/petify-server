const express = require('express')
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const admin = require("firebase-admin"); //firebase admin


const app = express();
const port = process.env.PORT || 3000;

//middleware
app.use(cors());
app.use(express.json());

//initialize firebase admin
var serviceAccount = require("./firebase-admin-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2vxppji.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // all collections here
    const usersCollection = client.db('petifyDB').collection('users');
    const petsCollection = client.db('petifyDB').collection('pets');

    //custom middlewares
    const verifyFBToken = async (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized access' });
      }
      const token = authHeader.split(' ')[1];
      if (!token) {
        return res.status(401).send({ message: 'Unauthorized access' });
      }

      //verify token
      try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.decoded = decoded;
        next();

      } catch (error) {
        return res.status(403).send({ message: 'Forbidden access' });
      }

    }

    // all routes here
    app.get('/', (req, res) => {
      res.send('Server is running')
    })

    // GET: Get user role by email
    app.get('/users/:email/role', async (req, res) => {
      try {
        const email = req.params.email;

        if (!email) {
          return res.status(400).send({ message: 'Email is required' });
        }

        const user = await usersCollection.findOne({ email });

        if (!user) {
          return res.status(404).send({ message: 'User not found' });
        }

        res.send({ role: user.role || 'user' });
      } catch (error) {
        console.error('Error getting user role:', error);
        res.status(500).send({ message: 'Failed to get role' });
      }
    });

    // get all users
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    })

    // post / create a user
    app.post('/users', async (req, res) => {
      const email = req.body.email;
      const userExists = await usersCollection.findOne({ email });
      if (userExists) {
        return res.status(400).send({ message: 'User already exists' });
      }
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);

    });

    //:::PETS API::: 

    // GET: Get all non-adopted pets for listing
    app.get('/pets/available', async (req, res) => {
      try {
        const pets = await petsCollection
          .find({ adopted: { $ne: true } })
          .sort({ createdAt: -1 })
          .toArray();
        res.send(pets);
      } catch (error) {
        console.error('Error fetching available pets:', error);
        res.status(500).send({ message: 'Failed to fetch available pets' });
      }
    });
    //get pets by user id
    app.get('/pets/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const pet = await petsCollection.findOne({ _id: new ObjectId(id) });

        if (!pet) {
          return res.status(404).send({ message: 'Pet not found' });
        }

        res.send(pet);
      } catch (error) {
        console.error('Error fetching pet:', error);
        res.status(500).send({ message: 'Failed to fetch pet' });
      }
    });

    // POST: Create a new pet
    app.post('/pets', async (req, res) => {
      try {
        const newPets = req.body;
        // newPets.createdAt = new Date();
        const result = await petsCollection.insertOne(newPets);
        res.status(201).send(result);
      } catch (error) {
        console.error('Error inserting pets:', error);
        res.status(500).send({ message: 'Failed to create pets' });
      }
    });



    // GET: Get pets by user email
    app.get('/pets', async (req, res) => {
      try {
        const { email } = req.query;
        if (!email) {
          return res.status(400).send({ message: 'Email is required' });
        }
        const pets = await petsCollection.find({ userEmail: email }).toArray();
        res.send(pets);
      } catch (error) {
        console.error('Error fetching pets:', error);
        res.status(500).send({ message: 'Failed to fetch pets' });
      }
    });



   

    // PUT: Update pet information
    app.put('/pets/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const updateData = req.body;

        // Remove fields that shouldn't be updated
        delete updateData._id;
        delete updateData.createdAt;
        delete updateData.adopted;

        const result = await petsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: 'Pet not found' });
        }

        res.send({ message: 'Pet updated successfully' });
      } catch (error) {
        console.error('Error updating pet:', error);
        res.status(500).send({ message: 'Failed to update pet' });
      }
    });

    // DELETE: Delete a pet
    app.delete('/pets/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const result = await petsCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
          return res.status(404).send({ message: 'Pet not found' });
        }
        res.send({ message: 'Pet deleted successfully' });
      } catch (error) {
        console.error('Error deleting pet:', error);
        res.status(500).send({ message: 'Failed to delete pet' });
      }
    });

    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});