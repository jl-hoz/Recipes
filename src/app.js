import { GraphQLServer } from 'graphql-yoga';
import { rmRecipe } from './utils';
import { MongoClient, ObjectID } from "mongodb";
import "babel-polyfill";

const usr = "jl";
const pwd = "admin123";
const url = "cluster0-bwtd1.gcp.mongodb.net/test";

/**
 * Connects to MongoDB Server and returns connected client
 * @param {string} usr MongoDB Server user
 * @param {string} pwd MongoDB Server pwd
 * @param {string} url MongoDB Server url
 */
const connectToDb = async function (usr, pwd, url) {
	const uri = `mongodb+srv://${usr}:${pwd}@${url}`;
	const client = new MongoClient(uri, {
		useNewUrlParser: true,
		useUnifiedTopology: true
	});

	await client.connect();
	return client;
};

const runGraphQLServer = function (context) {

	// Definición de tipos, query's y mutation's en GraphQL
	const typeDefs = `
		type Recipe{
			_id: ID!
			title: String!
			description: String!
			date: String!
			author: Author!
			ingredients: [Ingredient!]
		}

		type Author{
			_id: ID!
			name: String!
			email: String!
			recipes: [Recipe!]
		}

		type Ingredient{
			_id: ID!
			name: String!
			recipes: [Recipe!]
		}

		type Query{
			recipes: [Recipe]
			authors: [Author!]
			ingredients: [Ingredient!]
			recipesFromAuthor(id: ID!): [Recipe!]
			recipesWithIngredient(id: ID!): [Recipe!]
		}

		type Mutation{
			addRecipe(title: String!, description: String!, author: ID!, ingredients: [ID!]): Recipe
			addAuthor(name: String!, email: String!): Author
			addIngredient(name: String!): Ingredient
			deleteRecipe(id: ID!): Recipe
			deleteAuthor(id: ID!): Author
			deleteIngredient(id: ID!): Ingredient
			updateRecipe(id: ID!, title: String, description: String): Recipe
			updateAuthor(id: ID!, name: String, email: String): Author
			updateIngredient(id: ID!, name: String!): Ingredient
		}
	`;

	const resolvers = {

		Recipe: {
			author: async (parent, args, ctx, info) => {
				const { client } = ctx;
				const db = client.db("RecipesDatabase");
				const collection = db.collection('authors');
				const authorID = parent.author;
				return await collection.findOne({ _id: ObjectID(authorID) });;
			},
			ingredients: async (parent, args, ctx, info) => {
				const { client } = ctx;
				const db = client.db("RecipesDatabase");
				const collection = db.collection('ingredients');
				const ingredients = parent.ingredients.map(async (ingredientID) => {
					return await collection.findOne({ _id: ObjectID(ingredientID) });
				});
				console.log(ingredients);
				return ingredients;
			}
		},

		Author: {
			recipes: async (parent, args, ctx, info) => {
				const { client } = ctx;
				const db = client.db("RecipesDatabase");
				const collection = db.collection('recipes');
				const authorID = parent._id;
				return await collection.find({ author: ObjectID(authorID) }).toArray();
			},

		},

		Ingredient: {
			recipes: async (parent, args, ctx, info) => {
				const { client } = ctx;
				const db = client.db("RecipesDatabase");
				const collection = db.collection('recipes');
				const ingredientID = parent._id;
				return await collection.find({ ingredients: { $elemMatch: { $eq: ObjectID(ingredientID) } } }).toArray();
			},
		},

		Query: {
			recipes: async (parent, args, ctx, info) => {
				const { client } = ctx;
				// Connect to database and obtain table
				const db = client.db("RecipesDatabase");
				const collection = db.collection('recipes');
				// Return array of table
				return await collection.find({}).toArray();
			},
			authors: async (parent, args, ctx, info) => {
				const { client } = ctx;
				// Connect to database and obtain table
				const db = client.db("RecipesDatabase");
				const collection = db.collection('authors');
				// Return array of table
				return await collection.find({}).toArray();
			},
			ingredients: async (parent, args, ctx, info) => {
				const { client } = ctx;
				// Connect to database and obtain table
				const db = client.db("RecipesDatabase");
				const collection = db.collection('ingredients');
				// Return array of table
				return await collection.find({}).toArray();
			},
			recipesFromAuthor: async (parent, args, ctx, info) => {
				const { client } = ctx;
				const db = client.db("RecipesDatabase");
				const collection = db.collection('recipes');
				const authorID = args.id;
				return await collection.find({ author: ObjectID(authorID) }).toArray();
			},
			recipesWithIngredient: async (parent, args, ctx, info) => {
				const { client } = ctx;
				const db = client.db("RecipesDatabase");
				const collection = db.collection('recipes');
				const ingredientID = args.id;
				return await collection.find({ ingredients: { $elemMatch: { $eq: ObjectID(ingredientID) } } }).toArray();
			},
		},

		Mutation: {
			// Add recipe: dependency on author and ingredient
			addRecipe: async (parent, args, ctx, info) => {
				const { client } = ctx;
				const { title, description, author, ingredients } = args;
				const date = new Date().getDate();

				// Connect to database and obtain table
				const db = client.db("RecipesDatabase");
				const collection = db.collection('recipes');

				// Check if exists recipe by name && IDsExist(author, ingredients)
				if (await collection.findOne({ title: title })) throw new Error(`${title} already exists`);

				// Set recipe in database
				const result = await collection.insertOne({
					title,
					description,
					author: ObjectID(author),
					ingredients: ingredients.map(ingredient => ObjectID(ingredient)),
					date
				});

				return {
					_id: result.ops[0]._id,
					title,
					description,
					date,
					author,
					ingredients,
				};
			},
			addAuthor: async (parent, args, ctx, info) => {
				const { name, email } = args;
				const { client } = ctx;

				// Connect to DB and obtain table
				const db = client.db("RecipesDatabase");
				const collection = db.collection("authors");

				// Check if an existing user has same email
				if (await collection.findOne({ email: email })) throw new Error(`${email} already exists`);

				// set author in DB
				const result = await collection.insertOne({ name, email });

				return {
					_id: result.ops[0]._id,
					name,
					email,
					recipes: []
				};
			},
			addIngredient: async (parent, args, ctx, info) => {
				const { name } = args;
				const { client } = ctx;

				// Connect to DB and obtain table
				const db = client.db("RecipesDatabase");
				const collection = db.collection("ingredients");

				// Check if an existing ingredient exists
				if (await collection.findOne({ name })) throw new Error(`${name} already exists`);

				// set ingredient in database
				const result = await collection.insertOne({ name });

				return {
					_id: result.ops[0]._id,
					name,
					recipes: [],
				};
			},
			//TODO:
			deleteRecipe: async (parent, args, ctx, info) => {
				const { client } = ctx;
				// Connect to DB and obtain table
				const db = client.db("RecipesDatabase");
				const collection = db.collection("recipes");
				// Find and delete
				const recipe = await collection.findOne({ _id: ObjectID(args.id) });
				if (recipe) {
					await collection.deleteOne({ _id: ObjectID(args.id) });
				}
				return recipe;
			},
			//TODO:
			deleteAuthor: async (parent, args, ctx, info) => {
				const { client } = ctx;
				// Connect to DB and obtain table
				const db = client.db("RecipesDatabase");
				const collection = db.collection("authors");
				const author = await collection.findOne({ _id: ObjectID(args.id) });
				if (author) {
					const recipesCollection = db.collection('recipes');
					await recipesCollection.deleteMany({author: ObjectID(args.id)});
					await collection.deleteOne({ _id: ObjectID(args.id) });
				}
				return author;
			},
			deleteIngredient: async (parent, args, ctx, info) => {
				const { client } = ctx;
				const db = client.db("RecipesDatabase");
				const ingredientsCollection = db.collection("ingredients");
				const ingredient = await ingredientsCollection.findOne({ _id: ObjectID(args.id) });
				if (ingredient) {
					const recipesCollection = db.collection('recipes');
					await recipesCollection.deleteMany({ingredients: ObjectID(args.id)});
					await ingredientsCollection.deleteOne({ _id: ObjectID(args.id) });
				}
				return ingredient;
			},
			updateRecipe: (parent, args, ctx, info) => {
				const { client } = ctx;
				const db = client.db("RecipesDatabase");
				const collection = db.collection("recipes");
				const date = new Date().getDate;
				if (collection.findOne({ _id: ObjectID(args.id) })) {
					if (args.title) {
						collection.updateOne({ _id: ObjectID(args.id) }, { $set: { title: args.title } });
					}
					if (args.description) collection.updateOne({ _id: ObjectID(args.id) }, { $set: { description: args.description } });
				} else {
					throw new Error(`${args.id} doesn't exists`);
				}
				return {
					_id: args.id,
					title: args.title,
					description: args.description,
					date,
				};
			},
			updateAuthor: (parent, args, ctx, info) => {
				const { client } = ctx;
				const db = client.db("RecipesDatabase");
				const collection = db.collection("authors");
				const email = args.email;
				const name = args.name;
				if (collection.findOne({ _id: args.id })) {
					if (email) {
						collection.updateOne({ _id: ObjectID(args.id) }, { $set: { email } });
					}
					if (name) {
						collection.updateOne({ _id: ObjectID(args.id) }, { $set: { name } });
					}
				} else {
					throw new Error(`${args.id} doesn't exists`)
				}

				return {
					_id: args.id,
					email,
					name,
				};
			},
			updateIngredient: (parent, args, ctx, info) => {
				const { client } = ctx;
				const db = client.db("RecipesDatabase");
				const collection = db.collection("ingredients");
				if (collection.findOne({ _id: args.id })) {
					collection.updateOne({ _id: ObjectID(args.id) }, { $set: { name: args.name } });
				} else {
					throw new Error(`${args.id} doesn't exists`);
				}
				return {
					_id: args.id,
					name: args.name,
				};
			}
		},

	};

	const server = new GraphQLServer({ typeDefs, resolvers, context });
	const options = {
		port: 8000
	};

	try {
		server.start(options, ({ port }) => console.log(`Server started, listening on port ${port} for incoming requests.`));
	} catch (e) {
		console.info(e);
		server.close();
	}
};

const runApp = async function () {
	const client = await connectToDb(usr, pwd, url);
	console.log("Connect to Mongo DB");
	try {
		runGraphQLServer({ client });
	} catch (e) {
		client.close();
	}
};

runApp();