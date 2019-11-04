import {GraphQLServer} from 'graphql-yoga';
import * as uuid from 'uuid';

// Variables globales que actuarán como base de datos (no persistente)
const recipesData = [];
const authorsData = [];
const ingredientsData = [];

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
        addRecipe(title: String!, description: String!, author: ID!, ingredients: [ID!]): Recipe!
        addAuthor(name: String!, email: String!): Author!
        addIngredient(name: String!): Ingredient!
        deleteRecipe(id: ID!): Recipe!
        deleteAuthor(id: ID!): Author!
        deleteIngredient(id: ID!): Ingredient!
        updateRecipe(id: ID!, title: String, description: String, author: ID, ingredients: [ID]): Recipe!
        updateAuthor(id: ID!, name: String, email: String, recipes: [ID]): Author!
        updateIngredient(id: ID!, name: String, recipes: [ID]): Ingredient!
    }
`

const resolvers = {

    Recipe: {
        author: (parent, args, ctx, info) => {
            const authorID = parent.author;
            return authorsData.find(author => author.id === authorID);
        },
        ingredients: (parent, args, ctx, info) => {
            const ingredientsID = parent.ingredients;
            return ingredientsID.map(ingredientID => {
                return ingredientsData.find(ingredient => ingredient.id === ingredientID);
            });
        }
    },

    Query: {
        
    },

    Mutation: {
        // Add recipe: dependency on author and ingredient
        addRecipe: (parent, args, ctx, info) => {
            const {title, description, author, ingredients} = args;
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
            recipesData.push(recipe);
            return recipe;
        },
        // Add author
        addAuthor: (parent, args, ctx, info) => {
            const {name, email} = args;
            if(authorsData.some(author => author.email === email)){
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
            const {name} = args;
            if(ingredientsData.some(ingredient => ingredient.name === name)){
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
    },

}

const server = new GraphQLServer({typeDefs, resolvers});
server.start((console.log('Server listening!')));


