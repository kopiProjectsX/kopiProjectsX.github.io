#!/bin/bash
ng build --configuration production --output-path docs --base-href https://kopiProjectsX.github.io
cp docs/index.html docs/404.html
touch docs/.nojekyll
echo "kopiProjectsX.github.io" >> docs/CNAME
git add docs/*
git commit -am "updates"
git push
