#spark -n 6 -p 3001 -E production tile_creator.js > logs/tile_creator.log &
#sleep 5
spark -n 16 -p 80 -E production app.js > logs/app.log &
