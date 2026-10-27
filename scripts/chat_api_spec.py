"""Add the portfolio assistant contract to the existing OpenAPI document."""
import json

def add_chat_contract(S, paths, operation, root):
    def ref(name): return {'$ref': '#/components/schemas/' + name}
    def obj(properties, required=None): return {'type': 'object', 'properties': properties, 'required': list(properties) if required is None else required, 'additionalProperties': False}
    def text(**kw): return {'type': 'string', **kw}
    def uid(nullable=False): return text(format='uuid', **({'nullable': True} if nullable else {}))
    def array(items, **kw): return {'type': 'array', 'items': items, **kw}
    def envelope(name): return obj({'data': ref(name)})
    S['ChatSource'] = obj({'id': text(minLength=1, maxLength=120), 'title': text(minLength=1, maxLength=160), 'url': text(pattern=r'^/(?![/\\])[^\\\s]*$', description='Server-verified local public portfolio URL. Never a model-provided arbitrary URL.')})
    S['ChatConfig'] = obj({'enabled': {'type': 'boolean'}, 'title': text(minLength=1,maxLength=80), 'welcomeMessage': text(minLength=1,maxLength=500), 'suggestedQuestions': array(text(minLength=1,maxLength=120),maxItems=6), 'maxMessageLength': {'type':'integer','minimum':1,'maximum':2000}, 'disclaimer': text(minLength=1,maxLength=250)})
    S['ChatConfigResponse'] = envelope('ChatConfig')
    S['ChatSession'] = obj({'id': uid(), 'token': text(minLength=32,maxLength=512,description='256-bit random bearer capability, returned once; keep in browser memory only.'), 'expiresAt': text(format='date-time')})
    S['ChatSessionResponse'] = envelope('ChatSession')
    S['ChatSessionCreate'] = obj({})
    # Empty-object schemas must omit required rather than use an empty array in OpenAPI3.0.
    S['ChatSessionCreate'].pop('required')
    S['ChatMessageRequest'] = obj({'clientMessageId': uid(), 'content': text(minLength=1,maxLength=2000,description='Trimmed plain text, never trusted system instructions.'), 'pagePath': text(minLength=1,maxLength=240,pattern=r'^/[^?\s\\]*$',description='Optional retrieval hint in spirit, required field in v1; send current pathname, without query/fragment. Never fetch this URL.')})
    S['ChatStartEvent'] = obj({'type':text(enum=['start']),'messageId':uid(),'clientMessageId':uid()})
    S['ChatDeltaEvent'] = obj({'type':text(enum=['delta']),'text':text(maxLength=2048)})
    S['ChatSourcesEvent'] = obj({'type':text(enum=['sources']),'sources':array(ref('ChatSource'),maxItems=5)})
    S['ChatDoneEvent'] = obj({'type':text(enum=['done']),'messageId':uid(),'text':text(minLength=1,maxLength=8000),'sources':array(ref('ChatSource'),maxItems=5),'finishReason':text(enum=['stop','length']),'knowledgeVersion':text(minLength=1,maxLength=80)})
    S['ChatErrorEvent'] = obj({'type':text(enum=['error']),'code':text(enum=['generation_failed','rate_limited','content_unavailable','cancelled']),'retryable':{'type':'boolean'}})
    S['ChatStreamEvent'] = {'oneOf':[ref(x) for x in ['ChatStartEvent','ChatDeltaEvent','ChatSourcesEvent','ChatDoneEvent','ChatErrorEvent']],'discriminator':{'propertyName':'type','mapping':{key:'#/components/schemas/'+value for key,value in [('start','ChatStartEvent'),('delta','ChatDeltaEvent'),('sources','ChatSourcesEvent'),('done','ChatDoneEvent'),('error','ChatErrorEvent')]}}}
    S['ChatStoredMessage'] = obj({'id':uid(),'clientMessageId':uid(),'role':text(enum=['user','assistant']),'text':text(maxLength=8000),'sources':array(ref('ChatSource'),maxItems=5),'status':text(enum=['complete','stopped','failed']),'createdAt':text(format='date-time')})
    S['ChatHistoryResponse'] = obj({'data':obj({'id':uid(),'expiresAt':text(format='date-time'),'messages':array(ref('ChatStoredMessage'),maxItems=40),'activeClientMessageId':uid(True)})})
    S['ChatKnowledgePolicy'] = obj({'includePublishedWriting':{'type':'boolean'},'profileSectionIds':array(text(minLength=1,maxLength=120),maxItems=12),'excludedPostIds':array(uid(),maxItems=100)})
    S['ChatSettingsWrite'] = obj({'publicConfig':ref('ChatConfig'),'knowledgePolicy':ref('ChatKnowledgePolicy')})
    S['ChatSettingsResponse'] = obj({'data':obj({'version':{'type':'integer','minimum':1},'updatedAt':text(format='date-time'),'settings':ref('ChatSettingsWrite')})})
    S['ChatKnowledgeResponse'] = obj({'data':obj({'status':text(enum=['empty','ready','building','failed']),'version':text(nullable=True,maxLength=80),'indexedAt':text(format='date-time',nullable=True),'sourceCount':{'type':'integer','minimum':0},'excludedDemoCount':{'type':'integer','minimum':0},'activeOperationId':uid(True)})})
    operation('/chat/config','get','getChatConfig','Read public assistant display configuration','ChatConfigResponse')
    operation('/chat/sessions','post','createChatSession','Create an anonymous, rate-limited conversation','ChatSessionResponse',code=201,body='ChatSessionCreate',response_headers=('Location',))
    operation('/chat/sessions/{id}','get','getChatHistory','Read the owning anonymous session history','ChatHistoryResponse',pathparams=('id',),errors=(401,404,410))
    operation('/chat/sessions/{id}','delete','deleteChatSession','Cancel generation, revoke token and delete history',code=204,pathparams=('id',),errors=(401,404,410))
    operation('/chat/sessions/{id}/messages','post','sendChatMessage','Send one user message and stream a grounded answer',body='ChatMessageRequest',pathparams=('id',),errors=(401,404,409,410))
    for path in ['/chat/config','/chat/sessions','/chat/sessions/{id}','/chat/sessions/{id}/messages']:
        for op in paths[path].values():
            op['tags']=['Chat']
            if '{id}' in path:op['security']=[{'ChatSessionToken':[]}]
            for response in op['responses'].values(): response.setdefault('headers',{})['Cache-Control']={'schema':text(),'description':'private, no-store; chat traffic must bypass public CDN caches.'}
    paths['/chat/sessions/{id}/messages']['post']['responses']['200']={'description':'UTF-8 SSE. Exactly one start, zero or more deltas/sources, then one done; an error frame terminates an unsuccessful stream. No automatic reconnect. See chat requirements for replay/cancellation semantics.','headers':{'Cache-Control':{'schema':text(),'description':'private, no-store, no-transform'},'X-Accel-Buffering':{'schema':text(enum=['no'])}},'content':{'text/event-stream':{'schema':text(),'x-event-schema':ref('ChatStreamEvent')}}}
    operation('/admin/chat/settings','get','getChatSettings','Read assistant configuration and source allowlist','ChatSettingsResponse',owner=True,response_headers=('ETag',))
    operation('/admin/chat/settings','put','updateChatSettings','Update assistant configuration and source allowlist','ChatSettingsResponse',body='ChatSettingsWrite',owner=True,conditional=True,errors=(409,),response_headers=('ETag',))
    operation('/admin/chat/knowledge','get','getChatKnowledge','Read knowledge snapshot status','ChatKnowledgeResponse',owner=True)
    operation('/admin/chat/knowledge/rebuild','post','rebuildChatKnowledge','Rebuild the approved public knowledge snapshot','OperationResponse',code=202,owner=True,idem=True,errors=(409,),response_headers=('Location','Retry-After'))
    S['Operation']['properties']['kind']['enum'].append('rebuild_chat_knowledge')
    config=json.loads((root/'src/data/chat.json').read_text());config['disclaimer']='AI answers can be imperfect. Check the sources.'
    example_session={'id':'00000000-0000-4000-8000-000000000021','token':'EXAMPLE_ONLY_NOT_A_REAL_SESSION_TOKEN_00000000000000000000','expiresAt':'2026-10-08T01:00:00Z'}
    request={'clientMessageId':'00000000-0000-4000-8000-000000000022','content':'What does Nagendra work on?','pagePath':'/'}
    message_id='00000000-0000-4000-8000-000000000023'
    start={'type':'start','messageId':message_id,'clientMessageId':request['clientMessageId']}
    done={'type':'done','messageId':message_id,'text':'Nagendra is a Senior Software Developer at GE Vernova, building interfaces and reusable components for Grid Solutions.','sources':[{'id':'profile-public-v1','title':'About Nagendra','url':'/'}],'finishReason':'stop','knowledgeVersion':'public-2026-10-08-v1'}
    stream=''.join(f'event: {event["type"]}\ndata: {json.dumps(event)}\n\n' for event in [start,{'type':'delta','text':done['text']},done])
    (root/'docs/examples/chat-stream-response.txt').write_text(stream)
    paths['/chat/sessions/{id}/messages']['post']['responses']['200']['content']['text/event-stream']['example']=stream
    return {'chat-config-response.json':{'data':config},'chat-session-response.json':{'data':example_session},'chat-message-request.json':request,'chat-done-event.json':done}
