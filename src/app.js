import { GraphQLServer } from 'graphql-yoga';
import * as uuid from 'uuid';
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

// Variables globales que actuarán como base de datos (no persistente)
const authorsData = [];
const ingredientsData = [];
const recipesData = [];

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
			updateRecipe(id: ID!, title: String, description: String, author: ID, ingredients: [ID]): Recipe
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
				return await collection.findOne({_id: ObjectID(authorID)});;
			},
			ingredients: async(parent, args, ctx, info) => {
				const { client } = ctx;
				const db = client.db("RecipesDatabase");
				const collection = db.collection('ingredients');
				const ingredients = parent.ingredients.map(async (ingredientID) => {
					return await collection.findOne({_id: ObjectID(ingredientID)});
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
			recipes: async(parent, args, ctx, info) => {
				const { client } = ctx;
				const db = client.db("RecipesDatabase");
				const collection = db.collection('recipes');
				const ingredientID = parent._id;
				return await collection.find({ ingredients: {$elemMatch:{$eq:ObjectID(ingredientID)}} }).toArray();
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
				return await collection.find({author: ObjectID(authorID)}).toArray();
			},
			recipesWithIngredient: async (parent, args, ctx, info) => {
				const { client } = ctx;
				const db = client.db("RecipesDatabase");
				const collection = db.collection('recipes');
				const ingredientID = args.id;
				return await collection.find({ ingredients: {$elemMatch:{$eq:ObjectID(ingredientID)}} }).toArray();
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
			//deleteAuthor
			deleteAuthor: async (parent, args, ctx, info) => {
				const { client } = ctx;
				// Connect to DB and obtain table
				const db = client.db("RecipesDatabase");
				const collection = db.collection("authors");
				const author = await collection.findOne({ _id: ObjectID(args.id) });
				if (author) {
					await collection.deleteOne({ _id: ObjectID(args.id) });	// delete by id obtain reference
				}
				return author;
			},
			//deleteIngredient
			deleteIngredient: async (parent, args, ctx, info) => {
				const { client } = ctx;
				// Connect to DB and obtain table
				const db = client.db("RecipesDatabase");
				const collection = db.collection("ingredients");
				const ingredients = await collection.findOne({ _id: ObjectID(args.id) });
				if (ingredients) {
					await collection.deleteOne({ _id: ObjectID(args.id) });	// delete by id obtain reference
				}
				return ingredients;
			},
			updateRecipe: (parent, args, ctx, info) => {
				const recipe = recipesData.find(recipe => recipe.id === args.id);
				const author = authorsData.find(author => author.id === args.author);
				recipe.title = args.title || recipe.title;
				recipe.description = args.description || recipe.description;
				if (author) {
					//Delete refence of recipe in older author
					const oldAuthor = authorsData.find(author => author.id === recipe.author);
					oldAuthor.recipes.splice(oldAuthor.recipes.indexOf(recipe.id), 1);
					//Push reference of recipe in new author
					author.recipes.push(args.id);
					recipe.author = author.id;
				}
				if (args.ingredients) {
					const oldIngredientsObjects = recipe.ingredients.map(ingredientID => {
						return ingredientsData.find(ingredient => ingredient.id === ingredientID);
					});
					// Delete reference of recipe in each older ingredient
					oldIngredientsObjects.forEach(ingredient => ingredient.recipes.splice(ingredient.recipes.indexOf(recipe.id), 1));
					console.log(oldIngredientsObjects);
					const ingredientsObjects = args.ingredients.map(ingredientID => {
						return ingredientsData.find(ingredient => ingredient.id === ingredientID);
					});
					ingredientsObjects.forEach(ingredient => ingredient.recipes.push(args.id));
					console.log(ingredientsObjects);
					recipe.ingredients = args.recipes;
				}
				return recipe;
			},
			/**
			 * GraphQL Mutation that updates an Author 
			 */
			updateAuthor: (parent, args, ctx, info) => {
				const author = authorsData.find(author => author.id === args.id);
				author.name = args.name || author.name;
				author.description = args.description || author.description;
				return author;
			},
			updateIngredient: (parent, args, ctx, info) => {
				const ingredient = ingredientsData.find(ingredient => ingredient.id === args.id);
				ingredient.name = args.name || ingredient.name;
				return ingredient;
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

export { authorsData, recipesData, ingredientsData };