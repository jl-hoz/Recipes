import {GraphQLServer} from 'graphql-yoga';
import * as uuid from 'uuid';

// Variables globales que actuarán como base de datos (no persistente)
const authorsData = [{
    id: "3644209f-f726-426a-94b2-2b334e12f450",
    name: "José Luis",
    email: "joseluis@delahoz.org",
    recipes: [],
}];
const ingredientsData = [
    {
	id: "b68d4e94-3f74-4df7-97d6-275bf354f81b",
	name: "Tomate",
	recipes: [],
    },
    {
	id: "0e2f3361-826c-4c8b-a335-b45d27e91de9",
	name: "Queso",
	recipes: [],
    },
    {
	id: "14083051-9b2f-4009-953d-a3a4b6e7ef41",
	name: "Masa",
	recipes: [],
    },
    {
	id: "bfd1c46c-19be-4169-8308-5e0572c1c412",
	name: "Pepperoni",
	recipes: [],
    },
];
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
        addRecipe(title: String!, description: String!, author: ID!, ingredients: [ID!]): Recipe!
        addAuthor(name: String!, email: String!): Author!
        addIngredient(name: String!): Ingredient!
        deleteRecipe(id: ID!): Boolean!
        deleteAuthor(id: ID!): Boolean!
        deleteIngredient(id: ID!): Boolean!
        updateRecipe(id: ID!, title: String, description: String, author: ID, ingredients: [ID]): Recipe!
        updateAuthor(id: ID!, name: String, email: String, recipes: [ID]): Author!
        updateIngredient(id: ID!, name: String, recipes: [ID]): Ingredient!
    }
`;

const resolvers = {

    Recipe: {
        author: (parent, args, ctx, info) => {
            const authorID = parent.author;
            const author =  authorsData.find(author => author.id === authorID);
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
    
    // Para que funcionen los show list tengo que implementar la sobreescritura de Author
    // e Ingredients, al igual que el objeto de arriba.
    Ingredient: {
	recipes: (parent , args, ctx, info) => {
	    const recipesID = parent.recipes;
	    return recipesID.map(id => {
		return recipesData.find(element => element.id === id);
	    });
	},
    },

    Query: {
	recipes: (parent, args, ctx, info) => {
	    return recipesData.map(recipe => {return recipe});
	},
        authors: (parent, args, ctx, info) => {
	    return authorsData.map(author => {return author});
	},
	ingredients: (parent, args, ctx, info) => {
	    return ingredientsData.map(ingredient => {return ingredient});
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
	deleteRecipe: (parent, args, ctx, info) => {
	    let flag = false;
	    const recipe = recipesData.find(recipe => recipe.id === args.id);
	    if(recipe){
		flag = true;
		const authorID = recipe.author;
		const ingredients = recipe.ingredients;
		//Delete reference of recipe in author
		const author = authorsData.find(author => author.id === authorID);
		author.recipes.splice(author.recipes.indexOf(args.id), 1);
		//Delete each reference of recipe in ingredients array
		ingredients.map(ingredientID => {
		    const ingredient = ingredientsData.find(ingredient => ingredient.id === ingredientID);
		    ingredient.recipes.splice(ingredient.recipes.indexOf(args.id), 1);
		});
		//Delete Recipe
		recipesData.splice(recipesData.indexOf(recipe), 1);
	    }
	    return flag;
	},
    },

};

const server = new GraphQLServer({typeDefs, resolvers});
server.start((console.log('Server listening!')));


