import{ct as h}from"./site-vtjqk0se.js";import{mt as u}from"./site-bab0thfc.js";var l="cachedOperationValue",t="cachedExecutionId";class r extends h{constructor(e,i){super(i);this.value=this.registerDataOutput("value",e),this.isValid=this.registerDataOutput("isValid",u)}_updateOutputs(e){let i=e._getExecutionVariable(this,t,-1),s=e._getExecutionVariable(this,l,null);if(s!==void 0&&s!==null&&i===e.executionId)this.isValid.setValue(!0,e),this.value.setValue(s,e);else try{let a=this._doOperation(e);if(a===void 0||a===null){this.isValid.setValue(!1,e);return}e._setExecutionVariable(this,l,a),e._setExecutionVariable(this,t,e.executionId),this.value.setValue(a,e),this.isValid.setValue(!0,e)}catch(a){this.isValid.setValue(!1,e)}}}
export{r as Lr};

//# debugId=0D7CEDB36E1EABA864756E2164756E21
//# sourceMappingURL=site-r6nbve0k.js.map
