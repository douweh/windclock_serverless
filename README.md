# Windclock Serverless Code

Sample code for a serverless (https://serverless.com/) *service* which periodically pushes the wind-speed and wind-direction to a Particle Photon (https://www.particle.io).

The data is gathered every 15 minutes from a weatherstation hosted by the Dutch KNMI (Weather Institute).

Run a `$ serverless deploy` to deploy code and know that it runs every 15 minutes.
To see logs, run `$ serverless logs -f update`.

