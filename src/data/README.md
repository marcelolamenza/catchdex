# Catalog data

`pokemon.json` is the app's bundled, canonical list of the 1,025 standard National Pokédex species. Each entry includes six current base stats (`hp`, `attack`, `defense`, `specialAttack`, `specialDefense`, `speed`) alongside its ID, generation, types, and sprite URL.

The base stats are adapted from the generation CSVs in [lgreski/pokemonData](https://github.com/lgreski/pokemonData), which credits Pokémon Database as its source for the updated Gen 7–9 statistics and documents the original CC0 dataset for earlier generations. The values are static species data; user catch/team progress remains separately stored in localStorage or Firestore.

PokéAPI also exposes base stats on each Pokémon resource, but querying 1,025 records during app startup would add unnecessary network work. The bundled values let the details view render immediately and work offline. For a future catalog refresh, compare the bundled values with the [PokéAPI Pokémon endpoint documentation](https://pokeapi.co/docs/v2#pokemon) and the [Serebii Sword/Shield Pokédex](https://www.serebii.net/pokedex-swsh/charmander/).
