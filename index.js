const express = require('express')
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const admin = require("firebase-admin"); //firebase admin
const stripe = require('stripe')(process.env.PAYMENT_GATEWAY_KEY); // Stripe setup


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
    const adoptionsCollection = client.db('petifyDB').collection('adoptions');
    const donationsCollection = client.db('petifyDB').collection('donations');
    const paymentsCollection = client.db('petifyDB').collection('payments');

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

    // :::::::::all routes here:::::::::
    app.get('/', (req, res) => {
      res.send('Server is running')
    })

    // :::::::: USER API ::::::::
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


     // PUT: Update pet adoption status
     app.put('/pets/:id/adopt', async (req, res) => {
      try {
        const id = req.params.id;
        const result = await petsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { adopted: true } }
        );
        if (result.matchedCount === 0) {
          return res.status(404).send({ message: 'Pet not found' });
        }
        res.send({ message: 'Pet marked as adopted successfully' });
      } catch (error) {
        console.error('Error updating pet:', error);
        res.status(500).send({ message: 'Failed to update pet' });
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

    //:::ADOPTIONS API:::

    // POST: Create a new adoption request
    app.post('/adoptions', async (req, res) => {
      try {
        const adoptionData = req.body;
        
        // Validate required fields
        const requiredFields = ['petId', 'petName', 'petImage', 'userName', 'userEmail', 'phoneNumber', 'address'];
        for (const field of requiredFields) {
          if (!adoptionData[field]) {
            return res.status(400).send({ message: `${field} is required` });
          }
        }

        // Check if pet exists and is available for adoption
        const pet = await petsCollection.findOne({ _id: new ObjectId(adoptionData.petId) });
        if (!pet) {
          return res.status(404).send({ message: 'Pet not found' });
        }

        if (pet.adopted) {
          return res.status(400).send({ message: 'Pet is already adopted' });
        }

        // Check if user has already submitted an adoption request for this pet
        const existingAdoption = await adoptionsCollection.findOne({
          petId: adoptionData.petId,
          userEmail: adoptionData.userEmail
        });

        if (existingAdoption) {
          return res.status(400).send({ message: 'You have already submitted an adoption request for this pet' });
        }

        // Add petOwnerEmail to the adoption data
        adoptionData.petOwnerEmail = pet.userEmail;

        // Add timestamp to adoption data
        adoptionData.createdAt = new Date();
        adoptionData.status = 'pending'; // pending, approved, rejected

        const result = await adoptionsCollection.insertOne(adoptionData);
        
        res.status(201).send({
          message: 'Adoption request submitted successfully',
          adoptionId: result.insertedId
        });
      } catch (error) {
        console.error('Error creating adoption request:', error);
        res.status(500).send({ message: 'Failed to submit adoption request' });
      }
    });

     // GET: Get all adoption requests (for admin)
     app.get('/adoptions', async (req, res) => {
      try {
        const adoptions = await adoptionsCollection
          .find()
          .sort({ createdAt: -1 })
          .toArray();
        res.send(adoptions);
      } catch (error) {
        console.error('Error fetching adoptions:', error);
        res.status(500).send({ message: 'Failed to fetch adoptions' });
      }
    });

    // GET: Get adoption requests by user email
    app.get('/adoptions/user/:email', async (req, res) => {
      try {
        const { email } = req.params;
        const adoptions = await adoptionsCollection
          .find({ userEmail: email })
          .sort({ createdAt: -1 })
          .toArray();
        res.send(adoptions);
      } catch (error) {
        console.error('Error fetching user adoptions:', error);
        res.status(500).send({ message: 'Failed to fetch user adoptions' });
      }
    });

    // PUT: Update adoption status (for pets owner)
    app.put('/adoptions/:id/status', async (req, res) => {
      try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'approved', 'rejected'].includes(status)) {
          return res.status(400).send({ message: 'Invalid status. Must be pending, approved, or rejected' });
        }

        const result = await adoptionsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: 'Adoption request not found' });
        }

        // If approved, mark the pet as adopted
        if (status === 'approved') {
          const adoption = await adoptionsCollection.findOne({ _id: new ObjectId(id) });
          if (adoption) {
            await petsCollection.updateOne(
              { _id: new ObjectId(adoption.petId) },
              { $set: { adopted: true } }
            );
          }
        }

        res.send({ message: 'Adoption status updated successfully' });
      } catch (error) {
        console.error('Error updating adoption status:', error);
        res.status(500).send({ message: 'Failed to update adoption status' });
      }
    });

    //:::DONATIONS API:::

    // POST: Create a new donation campaign
    app.post('/donations', async (req, res) => {
      try {
        const campaignData = req.body;
        
        // Validate required fields
        const requiredFields = ['petImage', 'maxAmount', 'lastDate', 'shortDescription', 'longDescription', 'userEmail'];
        for (const field of requiredFields) {
          if (!campaignData[field]) {
            return res.status(400).send({ message: `${field} is required` });
          }
        }

        // Validate that last date is in the future
        const lastDate = new Date(campaignData.lastDate);
        const now = new Date();
        if (lastDate <= now) {
          return res.status(400).send({ message: 'Last date must be in the future' });
        }

        // Validate max amount is positive
        if (campaignData.maxAmount <= 0) {
          return res.status(400).send({ message: 'Maximum amount must be greater than 0' });
        }

        const result = await donationsCollection.insertOne(campaignData);
        
        res.status(201).send({
          message: 'Donation campaign created successfully',
          insertedId: result.insertedId
        });
      } catch (error) {
        console.error('Error creating donation campaign:', error);
        res.status(500).send({ message: 'Failed to create donation campaign' });
      }
    });

    // GET: Get all donation campaigns with pagination
    app.get('/donations', async (req, res) => {
      try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Get total count for pagination
        const totalCount = await donationsCollection.countDocuments();
        
        // Get campaigns with pagination
        const campaigns = await donationsCollection
          .find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray();

        console.log(`Campaigns found: ${campaigns.length} (page ${page}, limit ${limit})`);
        
        res.send({
          campaigns,
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasMore: page * limit < totalCount
        });
      } catch (error) {
        console.error('Error fetching donation campaigns:', error);
        res.status(500).send({ message: 'Failed to fetch donation campaigns' });
      }
    });

    // GET: Get donation campaigns by user email with pagination
    app.get('/donations/user/:email', verifyFBToken, async (req, res) => {
      try {
        const { email } = req.params;
        const { page = 1, limit = 10 } = req.query;
        
        console.log('Fetching campaigns for user email:', email, 'page:', page, 'limit:', limit);
        
        // Convert to numbers
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        
        // Get total count for pagination
        const totalCampaigns = await donationsCollection.countDocuments({ userEmail: email });
        
        // Get paginated campaigns
        const campaigns = await donationsCollection
          .find({ userEmail: email })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .toArray();
        
        console.log('User campaigns found:', campaigns.length, 'total:', totalCampaigns);
        
        // Calculate total pages
        const totalPages = Math.ceil(totalCampaigns / limitNum);
        
        res.send({
          campaigns,
          totalPages,
          totalCampaigns,
          currentPage: pageNum,
          hasMore: pageNum < totalPages
        });
      } catch (error) {
        console.error('Error fetching user donation campaigns:', error);
        res.status(500).send({ message: 'Failed to fetch user donation campaigns' });
      }
    });

    // GET: Get a specific donation campaign by ID
    app.get('/donations/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const campaign = await donationsCollection.findOne({ _id: new ObjectId(id) });

        if (!campaign) {
          return res.status(404).send({ message: 'Donation campaign not found' });
        }

        res.send(campaign);
      } catch (error) {
        console.error('Error fetching donation campaign:', error);
        res.status(500).send({ message: 'Failed to fetch donation campaign' });
      }
    });

    // PUT: Update donation campaign
    app.put('/donations/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const updateData = req.body;

        // Remove fields that shouldn't be updated
        delete updateData._id;
        delete updateData.createdAt;
        delete updateData.userEmail;
        delete updateData.userName;

        // Validate status if it's being updated
        if (updateData.status && !['active', 'paused', 'completed', 'cancelled'].includes(updateData.status)) {
          return res.status(400).send({ message: 'Invalid status. Must be active, paused, completed, or cancelled' });
        }

        const result = await donationsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: 'Donation campaign not found' });
        }

        res.send({ message: 'Donation campaign updated successfully' });
      } catch (error) {
        console.error('Error updating donation campaign:', error);
        res.status(500).send({ message: 'Failed to update donation campaign' });
      }
    });

    // PUT: Update donation campaign status specifically
    app.put('/donations/:id/status', async (req, res) => {
      try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['active', 'paused', 'completed', 'cancelled'].includes(status)) {
          return res.status(400).send({ message: 'Invalid status. Must be active, paused, completed, or cancelled' });
        }

        const result = await donationsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: 'Donation campaign not found' });
        }

        res.send({ message: 'Donation campaign status updated successfully' });
      } catch (error) {
        console.error('Error updating donation campaign status:', error);
        res.status(500).send({ message: 'Failed to update donation campaign status' });
      }
    });

    // PUT: Add donation to campaign
    app.put('/donations/:id/donate', async (req, res) => {
      try {
        const { id } = req.params;
        const { amount } = req.body;

        if (!amount || amount <= 0) {
          return res.status(400).send({ message: 'Valid donation amount is required' });
        }

        // Get the current campaign to check limits
        const campaign = await donationsCollection.findOne({ _id: new ObjectId(id) });
        if (!campaign) {
          return res.status(404).send({ message: 'Donation campaign not found' });
        }

        // Check if campaign is active
        if (campaign.status !== 'active') {
          return res.status(400).send({ message: 'Campaign is not active for donations' });
        }

        // Check if donation would exceed max amount
        const newTotal = (campaign.totalDonations || 0) + amount;
        if (newTotal > campaign.maxAmount) {
          return res.status(400).send({ message: 'Donation would exceed campaign goal' });
        }

        // Update the total donations
        const result = await donationsCollection.updateOne(
          { _id: new ObjectId(id) },
          { 
            $set: { 
              totalDonations: newTotal,
              updatedAt: new Date() 
            } 
          }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: 'Donation campaign not found' });
        }

        res.send({ 
          message: 'Donation added successfully',
          newTotal,
          progress: Math.min((newTotal / campaign.maxAmount) * 100, 100)
        });
      } catch (error) {
        console.error('Error adding donation:', error);
        res.status(500).send({ message: 'Failed to add donation' });
      }
    });

    // DELETE: Delete a donation campaign
    app.delete('/donations/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const result = await donationsCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
          return res.status(404).send({ message: 'Donation campaign not found' });
        }
        res.send({ message: 'Donation campaign deleted successfully' });
      } catch (error) {
        console.error('Error deleting donation campaign:', error);
        res.status(500).send({ message: 'Failed to delete donation campaign' });
      }
    });

    // POST: Create Stripe payment intent
    app.post('/create-payment-intent', async (req, res) => {
      const { amountInCents } = req.body;
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: 'usd',
          payment_method_types: ['card'],
        });
        res.json({ clientSecret: paymentIntent.client_secret });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // POST: Record a donation payment and update campaign
    app.post('/payments', async (req, res) => {
      try {
        const { campaignId, email, donorName, amount, paymentMethod, transactionId } = req.body;
        if (!campaignId || !email || !amount || !paymentMethod || !transactionId) {
          return res.status(400).send({ message: 'Missing required payment fields' });
        }
        // 1. Update campaign's totalDonations
        const campaign = await donationsCollection.findOne({ _id: new ObjectId(campaignId) });
        if (!campaign) {
          return res.status(404).send({ message: 'Campaign not found' });
        }
        const newTotal = (campaign.totalDonations || 0) + amount;
        await donationsCollection.updateOne(
          { _id: new ObjectId(campaignId) },
          { $set: { totalDonations: newTotal, updatedAt: new Date() } }
        );
        // 2. Insert payment record
        const now = new Date();
        const paymentDoc = {
          campaignId,
          email,
          donorName,
          amount,
          paymentMethod,
          transactionId,
          paid_at_string: now.toISOString(),
          paid_at: now,
        };
        const paymentResult = await paymentsCollection.insertOne(paymentDoc);
        res.status(201).send({
          message: 'Donation payment recorded',
          insertedId: paymentResult.insertedId,
        });
      } catch (error) {
        console.error('Payment processing failed:', error);
        res.status(500).send({ message: 'Failed to record payment' });
      }
    });

    // GET: Get a specific donation campaign by ID
    app.get('/donations/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const campaign = await donationsCollection.findOne({ _id: new ObjectId(id) });

        if (!campaign) {
          return res.status(404).send({ message: 'Donation campaign not found' });
        }

        res.send(campaign);
      } catch (error) {
        console.error('Error fetching donation campaign:', error);
        res.status(500).send({ message: 'Failed to fetch donation campaign' });
      }
    });

    // PUT: Update donation campaign
    app.put('/donations/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const updateData = req.body;

        // Remove fields that shouldn't be updated
        delete updateData._id;
        delete updateData.createdAt;
        delete updateData.userEmail;
        delete updateData.userName;

        // Validate status if it's being updated
        if (updateData.status && !['active', 'paused', 'completed', 'cancelled'].includes(updateData.status)) {
          return res.status(400).send({ message: 'Invalid status. Must be active, paused, completed, or cancelled' });
        }

        const result = await donationsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: 'Donation campaign not found' });
        }

        res.send({ message: 'Donation campaign updated successfully' });
      } catch (error) {
        console.error('Error updating donation campaign:', error);
        res.status(500).send({ message: 'Failed to update donation campaign' });
      }
    });

    // PUT: Update donation campaign status specifically
    app.put('/donations/:id/status', async (req, res) => {
      try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['active', 'paused', 'completed', 'cancelled'].includes(status)) {
          return res.status(400).send({ message: 'Invalid status. Must be active, paused, completed, or cancelled' });
        }

        const result = await donationsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: 'Donation campaign not found' });
        }

        res.send({ message: 'Donation campaign status updated successfully' });
      } catch (error) {
        console.error('Error updating donation campaign status:', error);
        res.status(500).send({ message: 'Failed to update donation campaign status' });
      }
    });

    // PUT: Add donation to campaign
    app.put('/donations/:id/donate', async (req, res) => {
      try {
        const { id } = req.params;
        const { amount } = req.body;

        if (!amount || amount <= 0) {
          return res.status(400).send({ message: 'Valid donation amount is required' });
        }

        // Get the current campaign to check limits
        const campaign = await donationsCollection.findOne({ _id: new ObjectId(id) });
        if (!campaign) {
          return res.status(404).send({ message: 'Donation campaign not found' });
        }

        // Check if campaign is active
        if (campaign.status !== 'active') {
          return res.status(400).send({ message: 'Campaign is not active for donations' });
        }

        // Check if donation would exceed max amount
        const newTotal = (campaign.totalDonations || 0) + amount;
        if (newTotal > campaign.maxAmount) {
          return res.status(400).send({ message: 'Donation would exceed campaign goal' });
        }

        // Update the total donations
        const result = await donationsCollection.updateOne(
          { _id: new ObjectId(id) },
          { 
            $set: { 
              totalDonations: newTotal,
              updatedAt: new Date() 
            } 
          }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: 'Donation campaign not found' });
        }

        res.send({ 
          message: 'Donation added successfully',
          newTotal,
          progress: Math.min((newTotal / campaign.maxAmount) * 100, 100)
        });
      } catch (error) {
        console.error('Error adding donation:', error);
        res.status(500).send({ message: 'Failed to add donation' });
      }
    });

    // DELETE: Delete a donation campaign (TODO: admin can delete it)
    app.delete('/donations/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const result = await donationsCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
          return res.status(404).send({ message: 'Donation campaign not found' });
        }
        res.send({ message: 'Donation campaign deleted successfully' });
      } catch (error) {
        console.error('Error deleting donation campaign:', error);
        res.status(500).send({ message: 'Failed to delete donation campaign' });
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