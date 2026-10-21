import{ct}from"./site-9g4b0mvr.js";import{Nl}from"./site-4q8p9jr3.js";import{o}from"./site-1z5kawy5.js";class vm extends Nl{constructor(e){super(e);this.type="KeyDown",this.isRepeat=this.registerDataOutput("isRepeat",ct)}_executeEvent(e,t){let r=t.event.repeat??!1;if(r&&this.config?.ignoreRepeat)return!0;return this.isRepeat.setValue(r,e),super._executeEvent(e,t)}getClassName(){return"FlowGraphKeyDownEventBlock"}}o("FlowGraphKeyDownEventBlock",vm);
export{vm};

//# debugId=C3742D2E1DDBDED464756E2164756E21
//# sourceMappingURL=site-et026j5j.js.map
