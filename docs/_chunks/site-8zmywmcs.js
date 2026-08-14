import{du as J}from"./site-pehed6st.js";import{nu as H}from"./site-v2rprchq.js";var A="cachedOperationValue",D="cachedExecutionId";class K extends J{constructor(b,v){super(v);this.value=this.registerDataOutput("value",b),this.isValid=this.registerDataOutput("isValid",H)}_updateOutputs(b){let v=b._getExecutionVariable(this,D,-1),z=b._getExecutionVariable(this,A,null);if(z!==void 0&&z!==null&&v===b.executionId)this.isValid.setValue(!0,b),this.value.setValue(z,b);else try{let q=this._doOperation(b);if(q===void 0||q===null){this.isValid.setValue(!1,b);return}b._setExecutionVariable(this,A,q),b._setExecutionVariable(this,D,b.executionId),this.value.setValue(q,b),this.isValid.setValue(!0,b)}catch(q){this.isValid.setValue(!1,b)}}}
export{K as gr};

//# debugId=F225DC9C4B202C8864756E2164756E21
//# sourceMappingURL=site-8zmywmcs.js.map
