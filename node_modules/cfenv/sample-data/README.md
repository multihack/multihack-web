# sample environmental data

Some sample data for a node app which is bound to a mongodb service.

## `cf files <app> logs/env.log`

		Getting files for app hello-node in org <org> / space dev as <user>...
		OK

		TMPDIR=/home/vcap/tmp
		VCAP_APP_PORT=62372
		USER=vcap
		VCAP_APPLICATION={"limits":{"mem":128,"disk":1024,"fds":16384},"application_version":"b65714f0-7ccc-4ec1-a426-f007a9bc9de9","application_name":"hello-node","application_uris":["<cf-host>.<cf-domain>"],"version":"b65714f0-7ccc-4ec1-a426-f007a9bc9de9","name":"hello-node","space_name":"dev","space_id":"ca6e986f-be29-4ee0-a297-7e4ffde4ef49","uris":["<cf-host>.<cf-domain>"],"users":null,"instance_id":"9c7837ed0ef441bbb11e7436093698dd","instance_index":0,"host":"0.0.0.0","port":62372,"started_at":"2014-04-29 17:30:54 +0000","started_at_timestamp":1398792654,"start":"2014-04-29 17:30:54 +0000","state_timestamp":1398792654}
		PATH=/home/vcap/app/vendor/node/bin:/home/vcap/app/bin:/home/vcap/app/node_modules/.bin:/bin:/usr/bin
		PWD=/home/vcap
		VCAP_SERVICES={"mongodb-2.2":[{"name":"my-db","label":"mongodb-2.2","tags":["nosql","document","data_management"],"plan":"100","credentials":{"hostname":"<mongo-host>","host":"<mongo-host>","port":<mongo-port>,"username":"<mongo-username>","password":"<mongo-password>","name":"<mongo-name>","db":"db","url":"mongodb://<mongo-username>:<mongo-password>@<mongo-host>:<mongo-port>/db"}}]}
		SHLVL=1
		HOME=/home/vcap/app
		PORT=62372
		VCAP_APP_HOST=0.0.0.0
		DATABASE_URL=
		MEMORY_LIMIT=128m
		_=/usr/bin/env

## `process.env`

		{
		    "TMPDIR": "/home/vcap/tmp",
		    "VCAP_APP_PORT": "62372",
		    "USER": "vcap",
		    "VCAP_APPLICATION": "{\"limits\":{\"mem\":128,\"disk\":1024,\"fds\":16384},\"application_version\":\"b65714f0-7ccc-4ec1-a426-f007a9bc9de9\",\"application_name\":\"hello-node\",\"application_uris\":[\"<cf-host>.<cf-domain>\"],\"version\":\"b65714f0-7ccc-4ec1-a426-f007a9bc9de9\",\"name\":\"hello-node\",\"space_name\":\"dev\",\"space_id\":\"ca6e986f-be29-4ee0-a297-7e4ffde4ef49\",\"uris\":[\"<cf-host>.<cf-domain>\"],\"users\":null,\"instance_id\":\"9c7837ed0ef441bbb11e7436093698dd\",\"instance_index\":0,\"host\":\"0.0.0.0\",\"port\":62372,\"started_at\":\"2014-04-29 17:30:54 +0000\",\"started_at_timestamp\":1398792654,\"start\":\"2014-04-29 17:30:54 +0000\",\"state_timestamp\":1398792654}",
		    "PATH": "/home/vcap/app/vendor/node/bin:/home/vcap/app/bin:/home/vcap/app/node_modules/.bin:/bin:/usr/bin",
		    "PWD": "/home/vcap/app",
		    "VCAP_SERVICES": "{\"mongodb-2.2\":[{\"name\":\"my-db\",\"label\":\"mongodb-2.2\",\"tags\":[\"nosql\",\"document\",\"data_management\"],\"plan\":\"100\",\"credentials\":{\"hostname\":\"<mongo-host>\",\"host\":\"<mongo-host>\",\"port\":<mongo-port>,\"username\":\"<mongo-username>\",\"password\":\"<mongo-password>\",\"name\":\"<mongo-name>\",\"db\":\"db\",\"url\":\"mongodb://<mongo-username>:<mongo-password>@<mongo-host>:<mongo-port>/db\"}}]}",
		    "SHLVL": "1",
		    "HOME": "/home/vcap/app",
		    "PORT": "62372",
		    "VCAP_APP_HOST": "0.0.0.0",
		    "DATABASE_URL": "",
		    "MEMORY_LIMIT": "128m",
		    "_": "/home/vcap/app/vendor/node/bin/node",
		    "OLDPWD": "/home/vcap"
		}

## `cfenv.getAppEnv()`

		{
		    "app": {
		        "limits": {
		            "mem": 128,
		            "disk": 1024,
		            "fds": 16384
		        },
		        "application_version": "b65714f0-7ccc-4ec1-a426-f007a9bc9de9",
		        "application_name": "hello-node",
		        "application_uris": [
		            "<cf-host>.<cf-domain>"
		        ],
		        "version": "b65714f0-7ccc-4ec1-a426-f007a9bc9de9",
		        "name": "hello-node",
		        "space_name": "dev",
		        "space_id": "ca6e986f-be29-4ee0-a297-7e4ffde4ef49",
		        "uris": [
		            "<cf-host>.<cf-domain>"
		        ],
		        "users": null,
		        "instance_id": "9c7837ed0ef441bbb11e7436093698dd",
		        "instance_index": 0,
		        "host": "0.0.0.0",
		        "port": 62372,
		        "started_at": "2014-04-29 17:30:54 +0000",
		        "started_at_timestamp": 1398792654,
		        "start": "2014-04-29 17:30:54 +0000",
		        "state_timestamp": 1398792654
		    },
		    "services": {
		        "mongodb-2.2": [
		            {
		                "name": "my-db",
		                "label": "mongodb-2.2",
		                "tags": [
		                    "nosql",
		                    "document",
		                    "data_management"
		                ],
		                "plan": "100",
		                "credentials": {
		                    "hostname": "<mongo-host>",
		                    "host": "<mongo-host>",
		                    "port": <mongo-port>,
		                    "username": "<mongo-username>",
		                    "password": "<mongo-password>",
		                    "name": "<mongo-name>",
		                    "db": "db",
		                    "url": "mongodb://<mongo-username>:<mongo-password>@<mongo-host>:<mongo-port>/db"
		                }
		            }
		        ]
		    },
		    "name": "hello-node",
		    "port": 62372,
		    "bind": "0.0.0.0",
		    "urls": [
		        "https://<cf-host>.<cf-domain>"
		    ],
		    "url": "https://<cf-host>.<cf-domain>",
		    "isLocal": false
		}

## `appEnv.getServices()`

		{
		    "my-db": {
		        "name": "my-db",
		        "label": "mongodb-2.2",
		        "tags": [
		            "nosql",
		            "document",
		            "data_management"
		        ],
		        "plan": "100",
		        "credentials": {
		            "hostname": "<mongo-host>",
		            "host": "<mongo-host>",
		            "port": <mongo-port>,
		            "username": "<mongo-username>",
		            "password": "<mongo-password>",
		            "name": "<mongo-name>",
		            "db": "db",
		            "url": "mongodb://<mongo-username>:<mongo-password>@<mongo-host>:<mongo-port>/db"
		        }
		    }
		}
