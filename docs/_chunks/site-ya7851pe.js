import{lt}from"./site-a1xnpyy6.js";import{Nl}from"./site-1pa0gb5t.js";import{o}from"./site-39snrr7g.js";class vm extends Nl{constructor(e){super(e);this.type="KeyDown",this.isRepeat=this.registerDataOutput("isRepeat",lt)}_executeEvent(e,t){let r=t.event.repeat??!1;if(r&&this.config?.ignoreRepeat)return!0;return this.isRepeat.setValue(r,e),super._executeEvent(e,t)}getClassName(){return"FlowGraphKeyDownEventBlock"}}o("FlowGraphKeyDownEventBlock",vm);
export{vm};

//# debugId=4B32EE1E47CBBFA264756E2164756E21
//# sourceMappingURL=site-ya7851pe.js.map
