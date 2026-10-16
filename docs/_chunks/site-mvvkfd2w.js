import{tt}from"./site-n1qmzpg8.js";import{Dt}from"./site-p0tgjt0r.js";import{o}from"./site-zg1n9j37.js";class Rx extends tt{constructor(e){super(e);this.config=e;for(let n in this.config.eventData){let t=this.config.eventData[n],i=typeof t.type==="string"?t.type:t.type?.typeName,r=typeof t.type?.serialize==="function"?t.type:Dt(i);t.type=r,this.registerDataInput(n,r,t.value)}}_execute(e){let n=this.config.eventId,t={};for(let i of this.dataInputs)t[i.name]=i.getValue(e);e.configuration.coordinator.notifyCustomEvent(n,t),this.out._activateSignal(e)}serialize(e={}){super.serialize(e);let n={};for(let t in this.config.eventData){let i=this.config.eventData[t];if(n[t]={type:i.type.typeName},i.value!==void 0)n[t].value=i.value}e.config.eventData=n}getClassName(){return"FlowGraphSendCustomEventBlock"}}var a=!1;function Ix(){if(a)return;a=!0,o("FlowGraphSendCustomEventBlock",Rx)}Ix();
export{Rx,Ix};

//# debugId=684A8DC46D6CFE5264756E2164756E21
//# sourceMappingURL=site-mvvkfd2w.js.map
