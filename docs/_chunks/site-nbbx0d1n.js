import{ut}from"./site-xbnd7pgz.js";import{Bl}from"./site-yfwsp3pv.js";import{o}from"./site-6g9cre7m.js";class Sm extends Bl{constructor(e){super(e);this.type="KeyDown",this.isRepeat=this.registerDataOutput("isRepeat",ut)}_executeEvent(e,t){let r=t.event.repeat??!1;if(r&&this.config?.ignoreRepeat)return!0;return this.isRepeat.setValue(r,e),super._executeEvent(e,t)}getClassName(){return"FlowGraphKeyDownEventBlock"}}o("FlowGraphKeyDownEventBlock",Sm);
export{Sm};

//# debugId=6A2A6F672A341D4864756E2164756E21
//# sourceMappingURL=site-nbbx0d1n.js.map
