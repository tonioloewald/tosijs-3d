import{Ye}from"./site-yk445q08.js";import{I,Dr}from"./site-yrysffz4.js";import{o}from"./site-wcwq97n8.js";class hm extends Ye{constructor(t){super(t);this.functionName=this.registerDataInput("functionName",Dr),this.object=this.registerDataInput("object",I),this.context=this.registerDataInput("context",I,null),this.output=this.registerDataOutput("output",I)}_updateOutputs(t){let r=this.functionName.getValue(t),i=this.object.getValue(t),s=this.context.getValue(t);if(i&&r){let e=i[r];if(e&&typeof e==="function")this.output.setValue(e.bind(s),t)}}getClassName(){return"FlowGraphFunctionReference"}}var n=!1;function fm(){if(n)return;n=!0,o("FlowGraphFunctionReference",hm)}fm();
export{hm,fm};

//# debugId=1C4B218ABE0F7F3B64756E2164756E21
//# sourceMappingURL=site-bveeg00v.js.map
