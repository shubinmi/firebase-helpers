# Serve HTTP requests to Firebase easy. Turn object schema to RESTful API for FireStore.
- Let's imagine that you have firebase function 
```typescript 
export const rest = functions.https.onRequest(app);
```
- Where 
```
app
``` 
is express.Application which built by class of this pkg like 
```typescript 
new App(
    corsHandler,
    bodyParser.json(),
    bodyParser.urlencoded({extended: false})
)
    .attachRoute(crud)
    .app
```
-  Where 
```
crud
```  
is 
```
(a: express.Application) => void
``` 
and equivalent to following code 
```typescript 
import * as express from "express";
import {CrudEntity} from "../dto/crud-entity";
import {admin} from "../../admin";
import {authenticate, sendEmail} from "../middleware";
import {FirestoreCrud, rbm} from "@shmi/helper";

export default function crud(app: express.Application) {
    const rb = new rbm.RestBehaviorManager();
    const fsCrud = new FirestoreCrud(admin, rb);
    
    const crudEntity = new CrudEntity(); // own prop: public toThisFieldName: string
    capsule.ioMap = {transformThisFieldName: 'toThisFieldName'}; // mapping schema
    capsule.validator = () => true; // your custom validator
    
    const auth = new rbm.PrioritizedHandler(authenticate, 1);
    const emailOnCreated = new rbm.PrioritizedHandler(sendEmail, 200);
    
    fsCrud.attachEntity(crudEntity)
        .attachMiddleware(crudEntity, 'post', auth)
        .attachMiddleware(crudEntity, 'post', emailOnCreated);

    app.all('/crud' + rbm.RestBehaviorManager.reqRoutPathPart, rb.requestHandler());
}
```
Where 
```
CrudEntity
```
class must be extended from 
```
dto.Computed
```
- that's it, we are ready to accept http requests like this 
```
Request:
POST /firebase-project-id/region/rest/crud/crud-entity 
Content-Type: application/json
Authorization: Bearer JWT

{"transformThisFieldName":"content"}

Response:
{"id":"uuid | firestoreRandom", :"transformThisFieldName":"content"}

FireStore will get new raw in 'crud-entity' collection:
{"id":"uuid | firestoreRandom", :"toThisFieldName":"content"}
```
