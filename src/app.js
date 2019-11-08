import { GraphQLServer } from 'graphql-yoga';
import * as uuid from 'uuid';
import {rmRecipe} from './utils';

// Variables globales que actuarán como base de datos (no persistente)
const authorsData = [];
const ingredientsData = [];
const recipesData = [];

// Definición de tipos en GraphQL
const typeDefs = `
    type Recipe{
        id: ID!
        title: String!
        description: String!
        date: String!
        author: Author!
        ingredients: [Ingredient!]
    }

    type Author{
        id: ID!
        name: String!
        email: String!
        recipes: [Recipe!]
    }

    type Ingredient{
        id: ID!
        name: String!
        recipes: [Recipe!]
    }

    type Query{
        recipes: [Recipe!]
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
        deleteIngredient(id: ID!): String
        updateRecipe(id: ID!, title: String, description: String, author: ID, ingredients: [ID]): Recipe
        updateAuthor(id: ID!, name: String, email: String): Author
        updateIngredient(id: ID!, name: String!): Ingredient
    }
`;

const resolvers = {

	Recipe: {
		author: (parent, args, ctx, info) => {
			const authorID = parent.author;
			const author = authorsData.find(author => author.id === authorID);
			return author;
		},
		ingredients: (parent, args, ctx, info) => {
			const ingredientsID = parent.ingredients;
			return ingredientsID.map(ingredientID => {
				return ingredientsData.find(ingredient => ingredient.id === ingredientID);
			});
		}
	},

	Author: {
		recipes: (parent, args, ctx, info) => {
			const recipesID = parent.recipes;
			return recipesID.map(id => {
				return recipesData.find(element => element.id === id);
			});
		},

	},

	Ingredient: {
		recipes: (parent, args, ctx, info) => {
			const recipesID = parent.recipes;
			return recipesID.map(id => {
				return recipesData.find(element => element.id === id);
			});
		},
	},

	Query: {
		recipes: (parent, args, ctx, info) => {
			return recipesData.map(recipe => { return recipe });
		},
		authors: (parent, args, ctx, info) => {
			return authorsData.map(author => { return author });
		},
		ingredients: (parent, args, ctx, info) => {
			return ingredientsData.map(ingredient => { return ingredient });
		},
		recipesFromAuthor: (parent, args, ctx, info) => {
			const authorID = args.id;
			const author = authorsData.find(author => author.id === authorID);
			return author.recipes.map(recipeID => {
				const recipe = recipesData.find(recipe => recipe.id === recipeID);
				return recipe;
			});
		},
		recipesWithIngredient: (parent, args, ctx, info) => {
			const ingredientID = args.id;
			const ingredient = ingredientsData.find(ingredient => ingredient.id === ingredientID);
			return ingredient.recipes.map(recipeID => {
				const recipe = recipesData.find(recipe => recipe.id === recipeID);
				return recipe;
			});
		},
	},

	Mutation: {
		// Add recipe: dependency on author and ingredient
		addRecipe: (parent, args, ctx, info) => {
			const { title, description, author, ingredients } = args;
			// If recipeData have same title in one user
			const id = uuid.v4();
			const date = new Date().getDate();
			const recipe = {
				id,
				title,
				description,
				date,
				author,
				ingredients,
			};
			//TODO: add recipe id to ingredients that are used for and author
			const authorObject = authorsData.find(authors => authors.id === author);
			authorObject.recipes.push(id);
			console.log(authorObject.recipes);
			recipesData.push(recipe);
			ingredients.map(element => {
				const ing = ingredientsData.find(data => data.id === element);
				ing.recipes.push(id);
				console.log(ing.recipes);
			});
			return recipe;
		},
		// Add author
		addAuthor: (parent, args, ctx, info) => {
			const { name, email } = args;
			if (authorsData.some(author => author.email === email)) {
				throw new Error(`Email ${email} already in use`);
			}
			const id = uuid.v4();
			const author = {
				id,
				name,
				email,
				recipes: [],
			};
			authorsData.push(author);
			return author;
		},
		// Add ingredient
		addIngredient: (parent, args, ctx, info) => {
			const { name } = args;
			if (ingredientsData.some(ingredient => ingredient.name === name)) {
				throw new Error(`Ingredient ${name} already in use`);
			}
			const id = uuid.v4();
			const ingredient = {
				id,
				name,
				recipes: [],
			};
			ingredientsData.push(ingredient);
			return ingredient;
		},
		deleteRecipe: (parent, args, ctx, info) => {
			const recipe = recipesData.find(recipe => recipe.id === args.id);
			rmRecipe(recipe.id);
			return recipe;
		},
		//deleteAuthor
		deleteAuthor: (parent, args, ctx, info) => {
			const author = authorsData.find(author => author.id === args.id);
			if(author){
				author.recipes.forEach(recipeID => {
					rmRecipe(recipeID);
				});
				authorsData.splice(authorsData.indexOf(author), 1);
			}
			return author;
		},
		//TODO: deleteIngredient
		deleteIngredient: (parent, args, ctx, info) => {
			const ingredient = ingredientsData.find(ingredient => ingredient.id === args.id);
			if(ingredient){
				ingredient.recipes.forEach(recipeID => {
					const recipe = recipesData.find(recipe => recipe.id === recipeID);
					recipe.ingredients.splice(recipe.ingredients.indexOf(ingredient.id), 1);
				});
				ingredientsData.splice(ingredientsData.indexOf(ingredient), 1);
			}
			return 'Ingredient succesfully delete';
		},
		updateRecipe: (parent, args, ctx, info) => {
			const recipe = recipesData.find(recipe => recipe.id === args.id);
			const author = authorsData.find(author => author.id === args.author);
			recipe.title = args.title || recipe.title;
			recipe.description = args.description || recipe.description;
			if(author){
				//Delete refence of recipe in older author
				const oldAuthor = authorsData.find(author => author.id === recipe.author);
				oldAuthor.recipes.splice(oldAuthor.recipes.indexOf(recipe.id), 1);
				//Push reference of recipe in new author
				author.recipes.push(args.id);
				recipe.author = author.id;
			}
			if(args.ingredients){
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
			/*
			const recipe = recipesData.find(recipe => recipe.id === args.id);
			// const newDate = new Date().getDate();
			// recipe.date.concat(' | Update: ', newDate); 
			recipe.title = args.title || recipe.title;
			recipe.description = args.description || recipe.description;
			if (args.author) {
				const author = authorsData.find(author => author.id === args.author);
				if (author) {
					//If they are the same dont do nothing
					if (author.id !== recipe.author) {
						//Delete reference of recipe in old author
						const oldAuthor = authorsData.find(author => author.id === recipe.author);
						oldAuthor.recipes.splice(oldAuthor.recipes.indexOf(recipe.id), 1);
						//Push reference of recipe in new author
						author.recipes.push(args.id);
						recipe.author = author.id;
					}
				} else {
					throw new Error(`Author ${args.author} not found`);
				}
			}
			if (args.ingredients) {
				const ingredientsList = args.ingredients.map(ingredient => {
					if (!ingredientsData.some(ing => ing.id === ingredient)) {
						throw new Error(`Ingredient ${id} not found`);
					}
					return ingredientsData.find(ing => ing.id === ingredient);
				});
				//Delete reference of each ingredient in old ingredient
				const oldIngredientList = recipe.ingredients.map(ingredient => {
					const ingredientObject = ingredientsData.find(ing => ing.id === ingredient);
					ingredientObject.recipes.map(ingredient => {
						ingredient.recipes.splice(ingredient.recipes.indexOf(recipe.id, 1));
					});
				});
				//Push reference
				ingredientsList.forEach(ingredient => ingredient.recipes.push(args.id));
				recipe.ingredients = ingredientsList;
			}
			return recipe;
			*/
		},
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

const server = new GraphQLServer({ typeDefs, resolvers });
server.start((console.log('Server listening!')));


export {authorsData, recipesData, ingredientsData};