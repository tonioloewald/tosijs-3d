import{it}from"./site-sxxg2v6h.js";import{Bt}from"./site-fszd7aez.js";import{o}from"./site-9mf4pzsy.js";class Dx extends it{constructor(e){super(e);this.config=e;for(let n in this.config.eventData){let t=this.config.eventData[n],i=typeof t.type==="string"?t.type:t.type?.typeName,r=typeof t.type?.serialize==="function"?t.type:Bt(i);t.type=r,this.registerDataInput(n,r,t.value)}}_execute(e){let n=this.config.eventId,t={};for(let i of this.dataInputs)t[i.name]=i.getValue(e);e.configuration.coordinator.notifyCustomEvent(n,t),this.out._activateSignal(e)}serialize(e={}){super.serialize(e);let n={};for(let t in this.config.eventData){let i=this.config.eventData[t];if(n[t]={type:i.type.typeName},i.value!==void 0)n[t].value=i.value}e.config.eventData=n}getClassName(){return"FlowGraphSendCustomEventBlock"}}var a=!1;function Lx(){if(a)return;a=!0,o("FlowGraphSendCustomEventBlock",Dx)}Lx();
export{Dx,Lx};

//# debugId=9F3FB7FC69D9A30464756E2164756E21
//# sourceMappingURL=site-z6tdgq0c.js.map
