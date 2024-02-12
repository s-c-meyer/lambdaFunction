const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Readable } = require('stream');
const sharp = require('sharp');
const util = require('util');

//Instantiate a new S3 client object 
const s3 = new S3Client({ region: 'us-east-1' });

exports.handler = async (event) => {

  //read options from the event parameter
  console.log("Reading options from event:\n", util.inspect(event, { depth: 5 }));

  const srcBucket = event.Records[0].s3.bucket.name;
  const srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " ")); //key may have spaces or unicode non-ASCII characters
  const dstKey = srcKey.replace("original-images", "resized-images")

  //infer the image type from the file suffix
  const typeMatch = srcKey.match(/\.([^.]*)$/);
  if (!typeMatch) {
    console.log("Could not determine the image type.");
    return;
  }

  //check that the image type is supported
  const imageType = typeMatch[1].toLowerCase();
  if (imageType != "jpg" && imageType != "png") {
    console.log(`Unsupported image type: ${imageType}`);
    return;
  }

  //get the image using GetObjectCommand
  try {
    const getObjectParams = {
      Bucket: srcBucket,
      Key: srcKey
    };
    var response = await s3.send(new GetObjectCommand(getObjectParams));
    var stream = response.Body;

    // Convert stream to buffer to pass to sharp resize function.
    if (stream instanceof Readable) {
      var content_buffer = Buffer.concat(await stream.toArray());
    } else {
      throw new Error('Unknown object stream type');
    }
  } catch (error) {
    console.log(error);
    return;
  }

  //set thumbnail width. Resize will set the height automatically to maintain aspect ratio.
  const width = 200;

  // Use the sharp module to resize the image and save in a buffer.
  try {
    var output_buffer = await sharp(content_buffer).resize(width).toBuffer();
  } catch (error) {
    console.log(error);
    return;
  }

  //upload image to the S3 bucket using PutObjectCommand
  try {
    const putObjectParams = {
      Bucket: srcBucket,
      Key: dstKey,
      Body: output_buffer,
      ContentType: "image"
    };

    const putResult = await s3.send(new PutObjectCommand(putObjectParams));

  } catch (error) {
    console.log(error);
    return;
  }

  console.log('Successfully resized ' + srcBucket + '/' + srcKey +
    ' and uploaded to ' + srcBucket + '/' + dstKey);
};