A simple lambda function created to take an image in an S3 bucket and resize it.

This function assumes that you have an S3 bucket set up with two folders, "original-images/" and "resized-images/"

Images uploaded to "original-images/" will be automatically resized and stored in "resized-images/" for use.
