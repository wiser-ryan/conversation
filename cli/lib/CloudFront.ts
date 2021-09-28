import './config';
import AWS from 'aws-sdk';

const CloudFront = new AWS.CloudFront({
  apiVersion: '2019-03-26',
  region: 'us-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export default CloudFront;
