import {authorsData, recipesData, ingredientsData} from './app';

const rmRecipe = recipeID => {
    const recipe = recipesData.find(recipe => recipe.id === recipeID);
    if (recipe) {
        const authorID = recipe.author;
        const ingredients = recipe.ingredients;
        //Delete reference of recipe in author
        const author = authorsData.find(author => author.id === authorID);
        author.recipes.splice(author.recipes.indexOf(recipe.id), 1);
        //Delete each reference of recipe in ingredients array
        ingredients.forEach(ingredientID => {
            const ingredient = ingredientsData.find(ingredient => ingredient.id === ingredientID);
            ingredient.recipes.splice(ingredient.recipes.indexOf(recipe.id), 1);
        });
        //Delete Recipe
        recipesData.splice(recipesData.indexOf(recipe), 1);
    }else{
        throw new Error(`Recipe ${recipeID} was not found`);
    }
}

export {rmRecipe}