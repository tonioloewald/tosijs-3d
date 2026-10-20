import{ct}from"./site-ec8w6gnd.js";import{Nl}from"./site-g6pbskxd.js";import{o}from"./site-jv2cv0ev.js";class vm extends Nl{constructor(e){super(e);this.type="KeyDown",this.isRepeat=this.registerDataOutput("isRepeat",ct)}_executeEvent(e,t){let r=t.event.repeat??!1;if(r&&this.config?.ignoreRepeat)return!0;return this.isRepeat.setValue(r,e),super._executeEvent(e,t)}getClassName(){return"FlowGraphKeyDownEventBlock"}}o("FlowGraphKeyDownEventBlock",vm);
export{vm};

//# debugId=C3742D2E1DDBDED464756E2164756E21
//# sourceMappingURL=site-q382yffr.js.map
