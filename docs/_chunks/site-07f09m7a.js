import{lt}from"./site-f1rg9jqj.js";import{Ll}from"./site-fq52vnkv.js";import{o}from"./site-3q9e2x8k.js";class vm extends Ll{constructor(e){super(e);this.type="KeyDown",this.isRepeat=this.registerDataOutput("isRepeat",lt)}_executeEvent(e,t){let r=t.event.repeat??!1;if(r&&this.config?.ignoreRepeat)return!0;return this.isRepeat.setValue(r,e),super._executeEvent(e,t)}getClassName(){return"FlowGraphKeyDownEventBlock"}}o("FlowGraphKeyDownEventBlock",vm);
export{vm};

//# debugId=F76F55C299EA19F164756E2164756E21
//# sourceMappingURL=site-07f09m7a.js.map
