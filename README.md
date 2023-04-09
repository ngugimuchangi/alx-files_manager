# 0x04. Files manager
Simple file management API that allows users to:
- Upload files
- Retrieve information about the files
- Download the files
- Share uploaded files with other users

## How to Run
Clone the repo
```
git clone https://github.com/ngugimuchangi/alx-files_manager.git
```

Install required dependencies
```
cd alx-files_manager
npm install
```

Start worker
```
nmp run start-worker
```

Start express server
```
npm run start-server
```

## Environment
Environment variables you can adjust when running the express server
- `PORT`: express server's port
- `DB_HOST`: mongodb's server host address
- `DB_PORT`: mongodb's port
- `DB_DATABASE`: database to use
- `FOLDER_PATH`: absolute path to folder to store files

## Documentation
The API's documentation is available at [here](./documentation)

## Tests
Specify different `DB_DATABASE` and `FOLDER_PATH` environment when running test to avoid data loss in main database and folder
- Run specific test
```
DB_DATABASE='test_database' FOLDER_PATH='/tmp/test_folder'npm test tests/test_file.js
```
- Run all tests
```
DB_DATABASE='test_database' FOLDER_PATH='/tmp/test_folder'npm run test-all
```
## Authors
- [Duncan Ngugi](https://github.com/ngugimuchangi)
- [Samule Ekati](https://github.com/Samuthe)
