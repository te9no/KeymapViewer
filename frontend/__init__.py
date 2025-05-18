import os
import streamlit.components.v1 as components

_component_func = components.declare_component(
    "frontend_component",
    path=os.path.join(os.path.dirname(__file__), "dist"),
)

def frontend_component(input_value=None, key=None):
    return _component_func(input_value=input_value, key=key)
