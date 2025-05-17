import os
import streamlit.components.v1 as components

def init_keyboard_component():
    """Initialize the keyboard event component"""
    parent_dir = os.path.dirname(os.path.abspath(__file__))
    build_dir = os.path.join(parent_dir, "component", "keyboard")
    
    if not os.path.exists(build_dir):
        raise Exception(f"Component directory not found: {build_dir}")
    
    return components.declare_component(
        "keyboard_events",
        path=build_dir
    )
