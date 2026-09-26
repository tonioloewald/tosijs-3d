import{ut}from"./site-a5xw8xz8.js";import{Ll}from"./site-hxh8mvek.js";import{a}from"./site-2e9r9891.js";class pm extends Ll{constructor(e){super(e);this.type="KeyDown",this.isRepeat=this.registerDataOutput("isRepeat",ut)}_executeEvent(e,t){let r=t.event.repeat??!1;if(r&&this.config?.ignoreRepeat)return!0;return this.isRepeat.setValue(r,e),super._executeEvent(e,t)}getClassName(){return"FlowGraphKeyDownEventBlock"}}a("FlowGraphKeyDownEventBlock",pm);
export{pm};

//# debugId=1C148DD0DA5D932A64756E2164756E21
//# sourceMappingURL=site-m6yz2d3x.js.map
