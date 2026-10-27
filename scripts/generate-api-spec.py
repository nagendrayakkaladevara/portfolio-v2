"""Generate the proposed backend OpenAPI contract and concrete examples."""
from pathlib import Path
import json
root=Path(__file__).resolve().parent.parent
out=root/'docs'
S={}
def ref(name): return {'$ref':'#/components/schemas/'+name}
def string(**kw): return {'type':'string',**kw}
def uuid(nullable=False): return string(format='uuid',**({'nullable':True} if nullable else {}))
def date(nullable=False): return string(format='date-time',**({'nullable':True} if nullable else {}))
def array(items,**kw): return {'type':'array','items':items,**kw}
def obj(props,required=None,**kw): return {'type':'object','properties':props,'required':list(props) if required is None else required,'additionalProperties':False,**kw}
def envelope(name): return obj({'data':ref(name)})
def integer(**kw): return {'type':'integer',**kw}
slug=string(pattern='^[a-z0-9]+(?:-[a-z0-9]+)*$',minLength=1,maxLength=120)
S['Tag']=obj({'slug':{**slug,'maxLength':60},'name':string(minLength=1,maxLength=60)})
S['ArticleMedia']=obj({'id':uuid(),'url':string(format='uri',description='HTTPS public asset-domain rendition URL; preview fixtures may use root-relative URLs.'),'alt':string(maxLength=250),'width':integer(minimum=1),'height':integer(minimum=1),'caption':string(nullable=True,maxLength=500)})
mediaNullable={**S['ArticleMedia'],'nullable':True,'description':'Null when no cover is selected.'}
summary={'id':uuid(),'slug':slug,'title':string(minLength=1,maxLength=160),'excerpt':string(maxLength=320),'publishedAt':date(),'updatedAt':date(),'readingTimeMinutes':integer(minimum=1),'tags':array(ref('Tag'),maxItems=8),'coverImage':mediaNullable,'isDemo':{'type':'boolean','description':'Always false in production; true for clearly labeled preview content.'}}
S['PostSummary']=obj(summary)
S['Post']=obj({**summary,'bodyMarkdown':string(minLength=1,maxLength=200000),'media':array(ref('ArticleMedia'),maxItems=50)})
S['Pagination']=obj({'nextCursor':string(nullable=True),'hasMore':{'type':'boolean'},'limit':integer(minimum=1,maximum=50)})
def collection(item): return obj({'data':array(ref(item)),'pagination':ref('Pagination')})
S['PostList']=collection('PostSummary'); S['PostResponse']=envelope('Post')
S['MediaReference']=obj({'assetId':uuid(),'alt':string(maxLength=250),'caption':string(nullable=True,maxLength=500)})
S['PostWrite']=obj({'slug':slug,'title':string(minLength=1,maxLength=160),'excerpt':string(maxLength=320),'bodyMarkdown':string(minLength=1,maxLength=200000,description='Markdown images use asset://UUID tokens; no raw HTML or external images.'),'tags':array(ref('Tag'),maxItems=8),'coverAssetId':uuid(True),'media':array(ref('MediaReference'),maxItems=50)})
S['RevisionSummary']=obj({'id':uuid(),'postId':uuid(),'revisionNumber':integer(minimum=1),'title':string(),'createdAt':date()})
S['Revision']=obj({**S['RevisionSummary']['properties'],'content':ref('PostWrite')})
S['RevisionList']=collection('RevisionSummary');S['RevisionResponse']=envelope('Revision')
S['AdminPostSummary']=obj({'id':uuid(),'slug':slug,'title':string(),'lifecycle':string(enum=['draft','published','unpublished','archived']),'version':integer(minimum=1),'draftRevisionId':uuid(),'publishedRevisionId':uuid(True),'publishedAt':date(True),'updatedAt':date(),'activeOperationId':uuid(True)})
S['AdminPost']=obj({**S['AdminPostSummary']['properties'],'createdAt':date(),'draft':ref('Revision')})
S['AdminPostResponse']=envelope('AdminPost');S['AdminPostList']=collection('AdminPostSummary')
S['SocialLink']=obj({'label':string(minLength=1,maxLength=40),'url':string(format='uri',maxLength=2048)})
S['ProfileItem']=obj({'id':slug,'title':string(minLength=1,maxLength=160),'subtitle':string(nullable=True,maxLength=160),'description':string(maxLength=4000),'url':string(format='uri',nullable=True,maxLength=2048),'startedAt':string(format='date',nullable=True),'endedAt':string(format='date',nullable=True),'tags':array(string(maxLength=60),maxItems=20),'highlights':array(string(maxLength=500),maxItems=20)})
S['ProfileSection']=obj({'id':slug,'kind':string(enum=['work','projects','education','skills','recognition','interests']),'title':string(maxLength=80),'items':array(ref('ProfileItem'),maxItems=50)})
profile={'displayName':string(minLength=1,maxLength=100),'role':string(maxLength=120),'introduction':string(maxLength=4000),'email':string(format='email'),'location':string(nullable=True,maxLength=120),'socialLinks':array(ref('SocialLink'),maxItems=10),'sections':array(ref('ProfileSection'),maxItems=12)}
S['ProfileWrite']=obj({**profile,'avatarAssetId':uuid(True)})
S['Profile']=obj({**profile,'avatar':mediaNullable,'updatedAt':date()})
S['ProfileResponse']=envelope('Profile')
S['AdminProfile']=obj({'version':integer(minimum=1),'updatedAt':date(),'content':ref('ProfileWrite')})
S['AdminProfileResponse']=envelope('AdminProfile')
S['SessionResponse']=obj({'data':obj({'subject':string(),'displayName':string(),'expiresAt':date()})})
S['CsrfResponse']=obj({'data':obj({'token':string(),'expiresAt':date()})})
S['PublishRequest']=obj({'revisionId':uuid()})
S['UploadRequest']=obj({'fileName':string(minLength=1,maxLength=255),'contentType':string(enum=['image/jpeg','image/png','image/webp','image/avif']),'sizeBytes':integer(minimum=1,maximum=10485760),'sha256':string(pattern='^[a-f0-9]{64}$',nullable=True)},required=['fileName','contentType','sizeBytes'])
S['UploadResponse']=obj({'data':obj({'assetId':uuid(),'uploadUrl':string(format='uri',description='Bearer presigned PUT URL on the R2 S3 endpoint; never log.'),'method':string(enum=['PUT']),'headers':obj({'Content-Type':string()}),'expiresAt':date(),'maxBytes':integer(enum=[10485760])})})
S['AssetVariant']=obj({'name':string(),'width':integer(minimum=1),'height':integer(minimum=1),'sizeBytes':integer(minimum=1),'contentType':string(),'sha256':string(pattern='^[a-f0-9]{64}$')})
S['Asset']=obj({'id':uuid(),'version':integer(minimum=1),'state':string(enum=['RESERVED','PROCESSING','READY','REJECTED','DELETING','DELETED']),'fileName':string(),'contentType':string(nullable=True),'sizeBytes':integer(nullable=True,minimum=1),'width':integer(nullable=True,minimum=1),'height':integer(nullable=True,minimum=1),'sha256':string(nullable=True),'variants':array(ref('AssetVariant')),'rejectionCode':string(nullable=True),'createdAt':date(),'updatedAt':date(),'expiresAt':date(True),'operationId':uuid(True)})
S['AssetResponse']=envelope('Asset')
S['OperationResult']=obj({'resourceId':uuid(),'revisionId':uuid(True),'publicPath':string(nullable=True)},required=['resourceId'])
S['OperationError']=obj({'code':string(),'message':string()})
S['Operation']=obj({'id':uuid(),'kind':string(enum=['publish','unpublish','process_asset','delete_asset']),'resourceId':uuid(),'requestedRevisionId':uuid(True),'status':string(enum=['queued','running','retrying','succeeded','failed']),'stage':string(enum=['validating','processing','promoting','committing','refreshing','deleting','completed']),'progress':integer(minimum=0,maximum=100),'result':{**S['OperationResult'],'nullable':True},'error':{**S['OperationError'],'nullable':True},'createdAt':date(),'updatedAt':date()})
S['OperationResponse']=envelope('Operation')
S['Problem']=obj({'type':string(format='uri'),'title':string(),'status':integer(minimum=400,maximum=599),'detail':string(),'instance':string(),'traceId':string(),'code':string(),'errors':{'type':'object','additionalProperties':array(string())}},required=['type','title','status','detail','instance','traceId','code'])
S['Health']=obj({'status':string(enum=['ok','not_ready'])})
headers={'ETag':{'description':'Version token for conditional reads and writes.','schema':string()},'Location':{'description':'Canonical created resource or operation path.','schema':string()},'Retry-After':{'description':'Seconds before retry/poll.','schema':string()}}
params={
'limit':{'name':'limit','in':'query','schema':integer(minimum=1,maximum=50,default=20)},
'cursor':{'name':'cursor','in':'query','schema':string(maxLength=2048),'description':'Opaque signed cursor; do not parse or construct on the client.'},
'IfMatch':{'name':'If-Match','in':'header','required':True,'schema':string(),'description':'Exact resource ETag. Missing428; stale412.'},
'IfNoneMatch':{'name':'If-None-Match','in':'header','schema':string()},
'IdempotencyKey':{'name':'Idempotency-Key','in':'header','required':True,'schema':uuid(),'description':'24-hour owner/method/path scoped replay key. Reusing with different input409.'},
'Csrf':{'name':'X-CSRF-Token','in':'header','required':True,'schema':string(),'description':'Session-bound token for all state-changing owner requests.'}}
paths={}
def response(code,schema=None,description=None,hs=()):
    value={'description':description or {200:'Success',201:'Created',202:'Accepted; poll operation',204:'Success; no body',302:'Redirect',304:'Not modified'}[code]}
    if schema:value['content']={'application/json':{'schema':ref(schema)}}
    if hs:value['headers']={x:headers[x] for x in hs}
    return value
error_descriptions={400:'Invalid query, cursor or JSON',401:'Authentication required',403:'Forbidden or invalid CSRF',404:'Resource not found',409:'State conflict, duplicate slug, in-use asset or idempotency conflict',410:'Upload reservation expired',412:'Stale If-Match version',413:'Payload too large',415:'Unsupported media type',422:'Semantic validation failed',428:'If-Match precondition required',429:'Rate limited',503:'Dependency unavailable'}
def operation(path,method,operation_id,summary,output=None,code=200,body=None,owner=False,conditional=False,idem=False,pagination=False,pathparams=(),errors=(),response_headers=(),public_cache=False,extra=()):
    p=[{'name':n,'in':'path','required':True,'schema':(slug if n=='slug' else uuid())} for n in pathparams]
    if pagination:p += [{'$ref':'#/components/parameters/limit'},{'$ref':'#/components/parameters/cursor'}]
    if public_cache:p += [{'$ref':'#/components/parameters/IfNoneMatch'}]
    if conditional:p += [{'$ref':'#/components/parameters/IfMatch'}]
    if idem:p += [{'$ref':'#/components/parameters/IdempotencyKey'}]
    if owner and method in ('post','put','delete'):p += [{'$ref':'#/components/parameters/Csrf'}]
    p += list(extra)
    op={'operationId':operation_id,'summary':summary,'tags':['Admin' if owner else 'Public'],'security':[{'OwnerSession':[]}] if owner else [],'responses':{str(code):response(code,output,hs=response_headers)}}
    if p:op['parameters']=p
    if body:op['requestBody']={'required':True,'content':{'application/json':{'schema':ref(body)}}}
    error_codes=set(errors)|{429,503}
    if owner:error_codes|={401,403}
    if conditional:error_codes|={412,428}
    if body:error_codes|={400,413,415,422}
    if idem:error_codes|={409}
    for err in sorted(error_codes):
        op['responses'][str(err)]={'description':error_descriptions[err],'content':{'application/problem+json':{'schema':ref('Problem')}}}
        if err in (429,503):op['responses'][str(err)]['headers']={'Retry-After':headers['Retry-After']}
    if public_cache:op['responses']['304']=response(304,hs=('ETag',))
    paths.setdefault(path,{})[method]=op
operation('/profile','get','getProfile','Get the public profile','ProfileResponse',public_cache=True,response_headers=('ETag',))
operation('/posts','get','listPosts','List published post summaries','PostList',pagination=True,public_cache=True,errors=(400,),response_headers=('ETag',))
operation('/posts/{slug}','get','getPost','Read the published revision','PostResponse',pathparams=('slug',),public_cache=True,errors=(404,),response_headers=('ETag',))
operation('/auth/login','get','login','Begin OIDC authorization',code=302,response_headers=('Location',),extra=({'name':'returnTo','in':'query','schema':string(default='/admin'),'description':'Allowlisted relative owner route only.'},),errors=(400,))
operation('/auth/callback','get','oidcCallback','Validate OIDC callback and set session cookie',code=302,response_headers=('Location',),extra=({'name':'code','in':'query','schema':string()},{'name':'state','in':'query','schema':string()},{'name':'error','in':'query','schema':string()}),errors=(400,401,403))
operation('/auth/session','get','getSession','Read authenticated owner session','SessionResponse',owner=True)
operation('/auth/csrf','get','getCsrf','Issue a session-bound CSRF token','CsrfResponse',owner=True)
operation('/auth/logout','post','logout','Invalidate the current session',code=204,owner=True)
operation('/admin/profile','get','getAdminProfile','Read editable profile','AdminProfileResponse',owner=True,response_headers=('ETag',))
operation('/admin/profile','put','updateProfile','Replace editable profile atomically','AdminProfileResponse',body='ProfileWrite',owner=True,conditional=True,errors=(409,),response_headers=('ETag',))
operation('/admin/posts','get','listAdminPosts','List owner posts','AdminPostList',owner=True,pagination=True,errors=(400,),extra=({'name':'lifecycle','in':'query','schema':string(enum=['draft','published','unpublished','archived'])},))
operation('/admin/posts','post','createPost','Create a draft and first revision','AdminPostResponse',code=201,body='PostWrite',owner=True,idem=True,response_headers=('Location','ETag'))
operation('/admin/posts/{id}','get','getAdminPost','Read draft and publication metadata','AdminPostResponse',owner=True,pathparams=('id',),errors=(404,),response_headers=('ETag',))
operation('/admin/posts/{id}','put','updatePost','Save an immutable draft revision','AdminPostResponse',body='PostWrite',owner=True,conditional=True,pathparams=('id',),errors=(404,409),response_headers=('ETag',))
operation('/admin/posts/{id}','delete','archivePost','Soft archive an unpublished post',code=204,owner=True,conditional=True,pathparams=('id',),errors=(404,409))
operation('/admin/posts/{id}/publish','post','publishPost','Publish one exact stored revision','OperationResponse',code=202,body='PublishRequest',owner=True,conditional=True,idem=True,pathparams=('id',),errors=(404,409),response_headers=('Location','Retry-After','ETag'))
operation('/admin/posts/{id}/unpublish','post','unpublishPost','Remove public article visibility','OperationResponse',code=202,owner=True,conditional=True,idem=True,pathparams=('id',),errors=(404,409),response_headers=('Location','Retry-After','ETag'))
operation('/admin/posts/{id}/revisions','get','listRevisions','List immutable revision summaries','RevisionList',owner=True,pagination=True,pathparams=('id',),errors=(400,404))
operation('/admin/posts/{id}/revisions/{revisionId}','get','getRevision','Read one stored revision','RevisionResponse',owner=True,pathparams=('id','revisionId'),errors=(404,))
operation('/admin/media/uploads','post','reserveUpload','Reserve a private R2 upload','UploadResponse',code=201,body='UploadRequest',owner=True,idem=True,response_headers=('Location',))
operation('/admin/media/{id}/complete','post','completeUpload','Snapshot, validate and process uploaded bytes','OperationResponse',code=202,owner=True,idem=True,pathparams=('id',),errors=(404,409,410),response_headers=('Location','Retry-After'))
operation('/admin/media/{id}','get','getAsset','Read private asset processing metadata','AssetResponse',owner=True,pathparams=('id',),errors=(404,),response_headers=('ETag',))
operation('/admin/media/{id}/preview','get','previewAsset','Redirect to a 60-second private rendition URL',code=302,owner=True,pathparams=('id',),errors=(404,409),response_headers=('Location',))
operation('/admin/media/{id}','delete','deleteAsset','Delete an unreferenced asset asynchronously','OperationResponse',code=202,owner=True,conditional=True,idem=True,pathparams=('id',),errors=(404,409),response_headers=('Location','Retry-After'))
operation('/admin/operations/{id}','get','getOperation','Poll a durable asynchronous operation','OperationResponse',owner=True,pathparams=('id',),errors=(404,),response_headers=('Retry-After',))
operation('/health/live','get','liveness','Minimal process liveness','Health')
operation('/health/ready','get','readiness','Gateway-restricted dependency readiness','Health')
# Health responses are deliberately minimal; readiness must be restricted by the gateway.
for path in ('/health/live','/health/ready'):
    paths[path]['get']['tags']=['Operations'];paths[path]['get']['responses'].pop('429',None)
paths['/health/live']['get']['responses'].pop('503',None)
paths['/health/ready']['get']['responses']['503']={'description':'Not ready; no dependency secrets','content':{'application/json':{'schema':ref('Health')}}}
from chat_api_spec import add_chat_contract
chat_examples=add_chat_contract(S,paths,operation,root)
spec={'openapi':'3.0.3','info':{'title':'Sai Nagendra Portfolio API','version':'1.1.0','description':'PROPOSED backend contract. Frontend currently uses JSON fixtures. See backend requirements for draft isolation, conditional writes, R2 lifecycle and operational semantics.'},'servers':[{'url':'https://portfolio.example.com/api/v1','description':'Placeholder; replace with the same-origin production gateway.'}],'tags':[{'name':x} for x in ['Public','Admin','Operations','Chat']],'paths':paths,'components':{'schemas':S,'parameters':params,'securitySchemes':{'OwnerSession':{'type':'apiKey','in':'cookie','name':'portfolio_session','description':'Secure HttpOnly owner session established through OIDC. Mutations also require X-CSRF-Token.'}}}}
spec['components']['securitySchemes']['ChatSessionToken']={'type':'http','scheme':'bearer','description':'Opaque anonymous session capability; authorizes only the matching chat session, never owner/admin access.'}
(out/'openapi.json').write_text(json.dumps(spec,indent=2)+'\n')
fixture=json.loads((root/'src/data/posts.json').read_text())
post=fixture['posts'][0].copy();post['isDemo']=False
examples={'post-response.json':{'data':post},'post-list-response.json':{'data':[{k:v for k,v in post.items() if k not in ['media','bodyMarkdown']}],'pagination':{'nextCursor':None,'hasMore':False,'limit':20}},'create-draft-request.json':{'slug':'my-first-article','title':'My first article','excerpt':'An example draft payload.','bodyMarkdown':'## First section\n\nArticle text.','tags':[{'slug':'engineering','name':'Engineering'}],'coverAssetId':None,'media':[]},'upload-request.json':{'fileName':'architecture.png','contentType':'image/png','sizeBytes':204800},'upload-response.json':{'data':{'assetId':'00000000-0000-4000-8000-000000000090','uploadUrl':'https://ACCOUNT_ID.r2.cloudflarestorage.com/portfolio-private/staging/ASSET_ID/NONCE?X-Amz-Signature=REDACTED_EXAMPLE','method':'PUT','headers':{'Content-Type':'image/png'},'expiresAt':'2026-10-07T12:05:00Z','maxBytes':10485760}},'operation-response.json':{'data':{'id':'00000000-0000-4000-8000-000000000099','kind':'publish','resourceId':post['id'],'requestedRevisionId':'00000000-0000-4000-8000-000000000088','status':'queued','stage':'validating','progress':0,'result':None,'error':None,'createdAt':'2026-10-07T12:00:00Z','updatedAt':'2026-10-07T12:00:00Z'}},'problem-response.json':{'type':'https://portfolio.example.com/problems/stale-version','title':'This draft has changed','status':412,'detail':'Reload the latest version and reconcile your edits.','instance':'/api/v1/admin/posts/'+post['id'],'traceId':'example-trace-id','code':'stale_version'}}
examples.update(chat_examples)
for name,value in examples.items():(out/'examples'/name).write_text(json.dumps(value,indent=2)+'\n')
print(f'Generated {len(paths)} paths, {sum(len(p) for p in paths.values())} operations, {len(S)} schemas and {len(examples)} examples')
