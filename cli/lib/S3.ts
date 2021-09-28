import './config';
import AWS from 'aws-sdk';

const S3 = new AWS.S3({
  apiVersion: '2006-03-01',
  region: 'us-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export default S3;
